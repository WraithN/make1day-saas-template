// ── Model billing: routing, price sheet and a real usage ledger ─────────
//
// Why this exists: the template's AI lanes (chat, embeddings, video, image,
// voice) all talk to paid provider APIs, and an operator must be able to see
// what each call actually costs. Every provider SDK hands usage back on the
// response (OpenAI-compatible `usage.prompt_tokens` / `completion_tokens`,
// Anthropic `usage.input_tokens`, Gemini `usageMetadata`, embeddings
// `usage.total_tokens`); this module prices that usage against an
// admin-editable price sheet and appends it to `usage_events`.
//
// Honest limits, also stated in the admin console:
//   * fal-style media jobs (video/image) do not return a cost on the API
//     response - they are priced per unit from the table, so those rows are
//     marked source="priced" (an estimate at YOUR configured rate), while
//     token-metered rows are source="usage".
//   * the ledger is for the OPERATOR's cost view, not an invoicing system;
//     charging YOUR customers on top of it is a business layer you build
//     yourself (the video module already ships monthly credits in
//     lib/video/quota.ts).
// Storage mirrors lib/ai-usage.ts: Supabase tables when the service-role key
// is configured (migration 0015), otherwise the local SQLite file.

import { logger } from "@/lib/logger";

export type Lane = "chat" | "embed" | "video" | "image" | "voice";

export const LANES: Lane[] = ["chat", "embed", "video", "image", "voice"];

export type LaneRouting = {
  lane: Lane;
  provider: string;
  model: string;
  fallbackProvider: string;
  fallbackModel: string;
  /** Soft monthly budget per end user in USD; 0 disables the flag. */
  budgetUsdPerUserMonth: number;
};

export type LanePrice = {
  lane: Lane;
  /** "tokens" = chat/embed per-1k pricing; "unit" = per media unit. */
  mode: "tokens" | "unit";
  /** USD per 1k input tokens (tokens mode). */
  inputUsdPer1k: number;
  /** USD per 1k output tokens (tokens mode). */
  outputUsdPer1k: number;
  /** USD per unit (unit mode). */
  unitUsd: number;
  /** Unit label for unit mode: "second" | "image" | "character". */
  unit: string;
};

export type UsageRow = {
  day: string;
  lane: string;
  provider: string;
  model: string;
  inputUnits: number;
  outputUnits: number;
  costUsd: number;
  source: string;
};

// Market ballpark defaults (USD). Everything here is an EDITABLE estimate,
// shown as such in the console - the real bill always comes from the
// provider. Chat/embed defaults track gpt-4o-mini-class pricing.
const DEFAULT_PRICES: Record<Lane, LanePrice> = {
  chat: { lane: "chat", mode: "tokens", inputUsdPer1k: 0.00015, outputUsdPer1k: 0.0006, unitUsd: 0, unit: "" },
  embed: { lane: "embed", mode: "tokens", inputUsdPer1k: 0.00002, outputUsdPer1k: 0, unitUsd: 0, unit: "" },
  video: { lane: "video", mode: "unit", inputUsdPer1k: 0, outputUsdPer1k: 0, unitUsd: 0.35, unit: "clip" },
  image: { lane: "image", mode: "unit", inputUsdPer1k: 0, outputUsdPer1k: 0, unitUsd: 0.05, unit: "image" },
  voice: { lane: "voice", mode: "unit", inputUsdPer1k: 0, outputUsdPer1k: 0, unitUsd: 0.00015, unit: "character" },
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

type Be = {
  kind: "supabase" | "sqlite";
};

async function backend(): Promise<Be | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const role = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (url && role) return { kind: "supabase" };
  try {
    const { getDb } = await import("@/lib/sqlite");
    getDb();
    return { kind: "sqlite" };
  } catch {
    return null;
  }
}

async function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const role = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !role) return null;
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, role, { auth: { persistSession: false } });
}

// ── routing ───────────────────────────────────────────────────────────────
async function readRoutingTable(): Promise<Partial<Record<Lane, LaneRouting>>> {
  const be = await backend();
  const out: Partial<Record<Lane, LaneRouting>> = {};
  if (!be) return out;
  let rows: any[] = [];
  if (be.kind === "supabase") {
    const db = await adminClient();
    if (!db) return out;
    const { data } = await db.from("model_routing").select("*");
    rows = data || [];
  } else {
    const { all } = await import("@/lib/sqlite");
    rows = all("SELECT * FROM model_routing");
  }
  for (const r of rows) {
    const lane = (r.lane ?? "") as Lane;
    if (!LANES.includes(lane)) continue;
    out[lane] = {
      lane,
      provider: r.provider ?? "",
      model: r.model ?? "",
      fallbackProvider: r.fallback_provider ?? "",
      fallbackModel: r.fallback_model ?? "",
      budgetUsdPerUserMonth: Number(r.budget_usd_per_user_month ?? 0),
    };
  }
  return out;
}

let _routingCache: Partial<Record<Lane, LaneRouting>> = {};
let _routingAt = 0;

/** Routing for one lane, or null when the admin has not overridden it. */
export async function getRouting(lane: Lane): Promise<LaneRouting | null> {
  // Short cache: the AI hot path must not hit the DB on every token.
  if (Date.now() - _routingAt > 15_000) {
    _routingCache = await readRoutingTable();
    _routingAt = Date.now();
  }
  return _routingCache[lane] ?? null;
}

export async function allRouting(): Promise<Record<Lane, LaneRouting | null>> {
  const table = await readRoutingTable();
  const out = {} as Record<Lane, LaneRouting | null>;
  for (const lane of LANES) out[lane] = table[lane] ?? null;
  return out;
}

export async function setRouting(r: LaneRouting): Promise<void> {
  const be = await backend();
  if (!be) throw new Error("billing: no storage backend");
  if (be.kind === "supabase") {
    const db = await adminClient();
    if (!db) throw new Error("billing: supabase client unavailable");
    const { error } = await db.from("model_routing").upsert({
      lane: r.lane,
      provider: r.provider,
      model: r.model,
      fallback_provider: r.fallbackProvider,
      fallback_model: r.fallbackModel,
      budget_usd_per_user_month: r.budgetUsdPerUserMonth,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error("billing routing: " + error.message);
  } else {
    const { run } = await import("@/lib/sqlite");
    run(
      `INSERT INTO model_routing (lane, provider, model, fallback_provider, fallback_model, budget_usd_per_user_month, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(lane) DO UPDATE SET provider=excluded.provider, model=excluded.model,
         fallback_provider=excluded.fallback_provider, fallback_model=excluded.fallback_model,
         budget_usd_per_user_month=excluded.budget_usd_per_user_month, updated_at=excluded.updated_at`,
      r.lane, r.provider, r.model, r.fallbackProvider, r.fallbackModel, r.budgetUsdPerUserMonth, new Date().toISOString(),
    );
  }
  _routingAt = 0; // force refresh on the next read
}

// ── price sheet ───────────────────────────────────────────────────────────
async function readPriceTable(): Promise<Partial<Record<Lane, LanePrice>>> {
  const be = await backend();
  const out: Partial<Record<Lane, LanePrice>> = {};
  if (!be) return out;
  let rows: any[] = [];
  if (be.kind === "supabase") {
    const db = await adminClient();
    if (!db) return out;
    const { data } = await db.from("model_prices").select("*");
    rows = data || [];
  } else {
    const { all } = await import("@/lib/sqlite");
    rows = all("SELECT * FROM model_prices");
  }
  for (const r of rows) {
    const lane = (r.lane ?? "") as Lane;
    if (!LANES.includes(lane)) continue;
    out[lane] = {
      lane,
      mode: r.mode === "unit" ? "unit" : "tokens",
      inputUsdPer1k: Number(r.input_usd_per_1k ?? 0),
      outputUsdPer1k: Number(r.output_usd_per_1k ?? 0),
      unitUsd: Number(r.unit_usd ?? 0),
      unit: r.unit ?? "",
    };
  }
  return out;
}

/** Effective price for a lane: stored override merged over the defaults. */
export async function getPrice(lane: Lane): Promise<LanePrice> {
  const table = await readPriceTable();
  return table[lane] ?? DEFAULT_PRICES[lane];
}

export async function allPrices(): Promise<Record<Lane, LanePrice>> {
  const table = await readPriceTable();
  const out = {} as Record<Lane, LanePrice>;
  for (const lane of LANES) out[lane] = table[lane] ?? DEFAULT_PRICES[lane];
  return out;
}

export async function setPrice(p: LanePrice): Promise<void> {
  const be = await backend();
  if (!be) throw new Error("billing: no storage backend");
  if (be.kind === "supabase") {
    const db = await adminClient();
    if (!db) throw new Error("billing: supabase client unavailable");
    const { error } = await db.from("model_prices").upsert({
      lane: p.lane,
      mode: p.mode,
      input_usd_per_1k: p.inputUsdPer1k,
      output_usd_per_1k: p.outputUsdPer1k,
      unit_usd: p.unitUsd,
      unit: p.unit,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error("billing price: " + error.message);
  } else {
    const { run } = await import("@/lib/sqlite");
    run(
      `INSERT INTO model_prices (lane, mode, input_usd_per_1k, output_usd_per_1k, unit_usd, unit, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(lane) DO UPDATE SET mode=excluded.mode, input_usd_per_1k=excluded.input_usd_per_1k,
         output_usd_per_1k=excluded.output_usd_per_1k, unit_usd=excluded.unit_usd, unit=excluded.unit,
         updated_at=excluded.updated_at`,
      p.lane, p.mode, p.inputUsdPer1k, p.outputUsdPer1k, p.unitUsd, p.unit, new Date().toISOString(),
    );
  }
}

// ── the ledger ────────────────────────────────────────────────────────────
export type UsageInput = {
  lane: Lane;
  provider: string;
  model: string;
  /** Prompt tokens (tokens mode). */
  inputTokens?: number;
  /** Completion tokens (tokens mode). */
  outputTokens?: number;
  /** Units consumed (unit mode: seconds, images, characters). */
  units?: number;
  userId?: string | null;
  /** "usage" (provider-reported), "priced" (unit estimate) or "estimated" (char fallback). */
  source?: string;
};

export async function recordUsage(u: UsageInput): Promise<void> {
  try {
    const price = await getPrice(u.lane);
    let cost = 0;
    let inUnits = 0;
    let outUnits = 0;
    let source = u.source ?? "usage";
    if (price.mode === "tokens") {
      const it = Math.max(0, u.inputTokens ?? 0);
      const ot = Math.max(0, u.outputTokens ?? 0);
      if (!it && !ot) return; // nothing to meter
      if (!u.inputTokens && !u.outputTokens) return;
      inUnits = it;
      outUnits = ot;
      cost = (it / 1000) * price.inputUsdPer1k + (ot / 1000) * price.outputUsdPer1k;
    } else {
      const units = Math.max(0, u.units ?? 0);
      if (!units) return;
      outUnits = units;
      cost = units * price.unitUsd;
      source = source === "usage" ? "priced" : source;
    }
    const row = {
      day: today(),
      user_id: u.userId ?? null,
      lane: u.lane,
      provider: u.provider,
      model: u.model,
      input_units: inUnits,
      output_units: outUnits,
      cost_usd: Math.round(cost * 1e6) / 1e6,
      source,
      created_at: new Date().toISOString(),
    };
    const be = await backend();
    if (!be) return;
    if (be.kind === "supabase") {
      const db = await adminClient();
      if (!db) return;
      const { error } = await db.from("usage_events").insert({
        day: row.day, user_id: row.user_id, lane: row.lane, provider: row.provider,
        model: row.model, input_units: row.input_units, output_units: row.output_units,
        cost_usd: row.cost_usd, source: row.source, created_at: row.created_at,
      });
      if (error) logger.warn("billing insert failed", { message: error.message });
    } else {
      const { run } = await import("@/lib/sqlite");
      run(
        `INSERT INTO usage_events (day, user_id, lane, provider, model, input_units, output_units, cost_usd, source, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        row.day, row.user_id, row.lane, row.provider, row.model, row.input_units, row.output_units, row.cost_usd, row.source, row.created_at,
      );
    }
  } catch (err) {
    // The ledger must NEVER break a live generation call.
    logger.warn("billing recordUsage swallowed error", { message: String(err) });
  }
}

/** Rough token estimate when a streamed provider never sent a usage chunk. */
export function estimateTokens(chars: number): { inputTokens: number; outputTokens: number } {
  return { inputTokens: 0, outputTokens: Math.round(chars / 4) };
}

/** Ledger grouped by day x lane x model over the last `days` days. */
export async function ledger(days = 30): Promise<UsageRow[]> {
  const be = await backend();
  if (!be) return [];
  const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  if (be.kind === "supabase") {
    const db = await adminClient();
    if (!db) return [];
    const { data } = await db
      .from("usage_events")
      .select("day, lane, provider, model, input_units, output_units, cost_usd, source")
      .gte("day", since)
      .order("day", { ascending: false });
    return aggregate((data || []) as any[]);
  }
  const { all } = await import("@/lib/sqlite");
  return all(
    `SELECT day, lane, provider, model, SUM(input_units) AS input_units, SUM(output_units) AS output_units,
            SUM(cost_usd) AS cost_usd, MAX(source) AS source
     FROM usage_events WHERE day >= ?
     GROUP BY day, lane, provider, model
     ORDER BY day DESC, cost_usd DESC`,
    since,
  ) as unknown as UsageRow[];
}

function aggregate(rows: any[]): UsageRow[] {
  const map = new Map<string, UsageRow>();
  for (const r of rows) {
    const k = `${r.day}|${r.lane}|${r.provider}|${r.model}`;
    const cur = map.get(k) ?? {
      day: r.day, lane: r.lane, provider: r.provider, model: r.model,
      inputUnits: 0, outputUnits: 0, costUsd: 0, source: r.source ?? "usage",
    };
    cur.inputUnits += Number(r.input_units ?? 0);
    cur.outputUnits += Number(r.output_units ?? 0);
    cur.costUsd += Number(r.cost_usd ?? 0);
    map.set(k, cur);
  }
  return [...map.values()].sort((a, b) => (a.day < b.day ? 1 : -1));
}

/** Total spend of one end user this month (for budget flags next to quota). */
export async function userMonthSpendUsd(userId: string): Promise<number> {
  const be = await backend();
  if (!be) return 0;
  const month = new Date().toISOString().slice(0, 7);
  if (be.kind === "supabase") {
    const db = await adminClient();
    if (!db) return 0;
    const { data } = await db
      .from("usage_events")
      .select("cost_usd")
      .eq("user_id", userId)
      .gte("day", month + "-01");
    return (data || []).reduce((s: number, r: any) => s + Number(r.cost_usd ?? 0), 0);
  }
  const { get } = await import("@/lib/sqlite");
  const row = get<{ total: number | null }>(
    "SELECT SUM(cost_usd) AS total FROM usage_events WHERE user_id = ? AND day >= ?",
    userId,
    month + "-01",
  );
  return row?.total ?? 0;
}

export const BILLING_DEFAULTS = DEFAULT_PRICES;
