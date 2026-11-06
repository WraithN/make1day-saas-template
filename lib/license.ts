import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { env, isLicenseGateEnabled } from "@/lib/env";

// ───────────────────────────────────────────────────────────────
// License gate for POST /api/generate.
//
// Three ways to be entitled to download a ZIP:
//   1. An offline, HMAC-signed license key (issued after a Waffo payment).
//      Self-verifying — no DB lookup needed, works even on serverless.
//   2. A signed-in buyer with an active subscription row, or a license
//      record matching their email (auto-claim on login).
//   3. A small anonymous free quota per IP per UTC day (conversion funnel).
//
// Records are written to Supabase when configured, otherwise to `.data/`.
// The KEY itself never depends on either store, so a read-only filesystem
// cannot lock out paying customers.
// ───────────────────────────────────────────────────────────────

export const LICENSE_COOKIE = "sk_license";
export const LICENSE_HEADER = "x-shipkit-license";

export type LicensePayload = {
  v: 1;
  jti: string;
  email?: string;
  plan: "buyout" | "care";
  orderId?: string;
  iat: number; // seconds
  exp?: number; // seconds; absent = lifetime (Buyout)
};

export type LicenseRecord = {
  jti: string;
  key: string;
  email?: string;
  plan: "buyout" | "care";
  orderId?: string;
  createdAt: string;
  expiresAt?: string | null;
};

export type EntitlementReason =
  | "gate-off"
  | "license-key"
  | "license-email"
  | "subscription"
  | "free-trial"
  | "denied";

export type Entitlement = {
  allowed: boolean;
  reason: EntitlementReason;
  plan?: "buyout" | "care";
  remaining?: number;
};

// ── Offline key (HMAC-SHA256) ──────────────────────────────────────────────

function secret(): string {
  const s = env.licenseSecret();
  if (!s) {
    throw new Error(
      "LICENSE_SECRET is not configured — cannot issue or verify license keys.",
    );
  }
  return s;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function mac(payloadStr: string, key: string): string {
  return b64url(createHmac("sha256", key).update(payloadStr).digest());
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function signLicenseKey(payload: LicensePayload): string {
  const body = b64url(JSON.stringify(payload));
  return `SK1.${body}.${mac(body, secret())}`;
}

export function verifyLicenseKey(key: string): LicensePayload | null {
  try {
    const parts = String(key ?? "").trim().split(".");
    if (parts.length !== 3 || parts[0] !== "SK1") return null;
    const [, body, sig] = parts;
    if (!safeEqual(mac(body, secret()), sig)) return null;
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as LicensePayload;
    if (payload.v !== 1 || !payload.jti || !payload.plan) return null;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Store: Supabase when configured, local JSON otherwise ──────────────────

type StoreData = {
  licenses: LicenseRecord[];
  events: Record<string, string>;
  quota: Record<string, { day: string; used: number }>;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "license-store.json");

async function readStore(): Promise<StoreData> {
  try {
    const parsed = JSON.parse(await fs.readFile(FILE, "utf8")) as StoreData;
    return {
      licenses: parsed.licenses ?? [],
      events: parsed.events ?? {},
      quota: parsed.quota ?? {},
    };
  } catch {
    return { licenses: [], events: {}, quota: {} };
  }
}

async function writeStore(data: StoreData): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(data), "utf8");
}

// Serialise read-modify-write so concurrent requests cannot lose a license.
const globals = globalThis as unknown as { __skLicenseQueue?: Promise<unknown> };
async function withStore<T>(fn: (data: StoreData) => T | Promise<T>): Promise<T> {
  const prev = globals.__skLicenseQueue ?? Promise.resolve();
  const run = prev.then(async () => {
    const data = await readStore();
    const result = await fn(data);
    await writeStore(data);
    return result;
  });
  globals.__skLicenseQueue = run.catch(() => undefined);
  return run;
}

async function adminClient(): Promise<any | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return null;
  }
  try {
    const mod = await import("@/lib/supabase/admin");
    return mod.createSupabaseAdminClient();
  } catch {
    return null;
  }
}

/** Issue (or reuse) a license for a paid order. */
export async function issueLicense(params: {
  email?: string;
  plan: "buyout" | "care";
  orderId?: string;
  periodEnd?: string | null;
}): Promise<LicenseRecord> {
  const now = Math.floor(Date.now() / 1000);
  const exp = params.plan === "buyout"
    ? undefined
    : params.periodEnd && !Number.isNaN(Date.parse(params.periodEnd))
      ? Math.floor(Date.parse(params.periodEnd) / 1000)
      : now + 35 * 24 * 3600;

  const payload: LicensePayload = {
    v: 1,
    jti: randomUUID(),
    email: params.email?.toLowerCase() || undefined,
    plan: params.plan,
    orderId: params.orderId,
    iat: now,
    ...(exp ? { exp } : {}),
  };
  const key = signLicenseKey(payload);
  const record: LicenseRecord = {
    jti: payload.jti,
    key,
    email: payload.email,
    plan: payload.plan,
    orderId: payload.orderId,
    createdAt: new Date().toISOString(),
    expiresAt: exp ? new Date(exp * 1000).toISOString() : null,
  };

  const db = await adminClient();
  if (db) {
    const { error } = await db.from("licenses").insert({
      jti: record.jti,
      key: record.key,
      email: record.email ?? null,
      plan: record.plan,
      order_id: record.orderId ?? null,
      expires_at: record.expiresAt ?? null,
    });
    if (!error) return record;
    console.warn("license insert fell back to local store:", error.message);
  }
  await withStore((data) => {
    data.licenses.push(record);
  });
  return record;
}

/** Auto-claim: a signed-in buyer whose email matches an issued license. */
export async function findLicenseByEmail(
  email: string | undefined,
): Promise<LicenseRecord | null> {
  if (!email) return null;
  const normalized = email.toLowerCase();
  const db = await adminClient();
  if (db) {
    const { data } = await db
      .from("licenses")
      .select("*")
      .eq("email", normalized)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      return {
        jti: data.jti,
        key: data.key,
        email: data.email ?? undefined,
        plan: data.plan,
        orderId: data.order_id ?? undefined,
        createdAt: data.created_at,
        expiresAt: data.expires_at ?? null,
      } as LicenseRecord;
    }
  }
  return withStore((data) => {
    const found = [...data.licenses]
      .reverse()
      .find((l) => l.email?.toLowerCase() === normalized);
    if (!found) return null;
    if (found.expiresAt && Date.parse(found.expiresAt) < Date.now()) return null;
    const payload = verifyLicenseKey(found.key);
    return payload ? found : null;
  });
}

/** Admin view: recently issued keys (Basic-Auth-protected /admin only). */
export async function listLicenses(): Promise<LicenseRecord[]> {
  const db = await adminClient();
  if (db) {
    const { data } = await db
      .from("licenses")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) {
      return data.map((r: any) => ({
        jti: r.jti,
        key: r.key,
        email: r.email ?? undefined,
        plan: r.plan,
        orderId: r.order_id ?? undefined,
        createdAt: r.created_at,
        expiresAt: r.expires_at ?? null,
      }));
    }
  }
  return withStore((data) => [...data.licenses].reverse().slice(0, 50));
}

/** Idempotency for webhook retries. Returns true when the event is NEW. */
export async function recordWebhookEvent(
  eventType: string,
  eventId: string,
): Promise<boolean> {
  const id = `${eventType}:${eventId}`;
  const db = await adminClient();
  if (db) {
    const { error } = await db
      .from("webhook_events")
      .insert({ event_type: eventType, event_id: eventId });
    if (!error) return true;
    if (String(error.code) === "23505") return false; // unique violation
    console.warn("webhook event store fell back to local:", error.message);
  }
  return withStore((data) => {
    if (data.events[id]) return false;
    data.events[id] = new Date().toISOString();
    return true;
  });
}

// ── Free quota ─────────────────────────────────────────────────────────────

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const raw = fwd.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
  return createHash("sha256").update(raw).digest("hex").slice(0, 24);
}

async function consumeFreeQuota(
  req: Request,
): Promise<{ allowed: boolean; remaining: number }> {
  const limit = env.freeGenerationsPerDay();
  if (limit <= 0) return { allowed: false, remaining: 0 };
  const day = new Date().toISOString().slice(0, 10);
  const key = clientIp(req);
  return withStore((data) => {
    const entry = data.quota[key];
    const used = entry?.day === day ? entry.used : 0;
    if (used >= limit) return { allowed: false, remaining: 0 };
    data.quota[key] = { day, used: used + 1 };
    // Keep the file from growing unbounded (30-day retention).
    const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);
    for (const [k, v] of Object.entries(data.quota)) {
      if (v.day < cutoff) delete data.quota[k];
    }
    return { allowed: true, remaining: limit - used - 1 };
  });
}

// ── Entitlement check ──────────────────────────────────────────────────────

function cookieValue(req: Request, name: string): string | undefined {
  const raw = req.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export function licenseKeyFromRequest(
  req: Request,
  explicit?: string,
): string | undefined {
  return (
    explicit?.trim() ||
    req.headers.get(LICENSE_HEADER)?.trim() ||
    cookieValue(req, LICENSE_COOKIE)
  );
}

export async function checkEntitlement(
  req: Request,
  explicitKey?: string,
  opts?: { allowTrial?: boolean },
): Promise<Entitlement> {
  const allowTrial = opts?.allowTrial ?? true;
  if (!isLicenseGateEnabled()) {
    return { allowed: true, reason: "gate-off" };
  }

  // 1. Offline license key — no DB required.
  const key = licenseKeyFromRequest(req, explicitKey);
  if (key) {
    const payload = verifyLicenseKey(key);
    if (payload) {
      return { allowed: true, reason: "license-key", plan: payload.plan };
    }
  }

  // 2. Signed-in buyer: active subscription OR license claimed by email.
  try {
    const { getCurrentUser, getSubscription } = await import(
      "@/lib/subscriptions"
    );
    const user = await getCurrentUser();
    if (user) {
      const sub = await getSubscription(user.id);
      if (
        sub &&
        (sub.status === "active" || sub.status === "trialing") &&
        (sub.plan === "buyout" ||
          (sub.plan === "care" &&
            (!sub.current_period_end ||
              Date.parse(sub.current_period_end) > Date.now())))
      ) {
        return {
          allowed: true,
          reason: "subscription",
          plan: sub.plan === "buyout" ? "buyout" : "care",
        };
      }
      const owned = await findLicenseByEmail(user.email);
      if (owned) {
        return { allowed: true, reason: "license-email", plan: owned.plan };
      }
    }
  } catch {
    // Supabase not configured / session read failed → fall through to quota.
  }

  // 3. Anonymous trial quota. Used by the download gate as a conversion funnel,
  // but deliberately EXCLUDED from content paywalls (opts.allowTrial=false) so
  // premium content never opens to anonymous visitors.
  if (allowTrial) {
    const quota = await consumeFreeQuota(req);
    if (quota.allowed) {
      return {
        allowed: true,
        reason: "free-trial",
        remaining: quota.remaining,
      };
    }
  }

  return { allowed: false, reason: "denied", remaining: 0 };
}
