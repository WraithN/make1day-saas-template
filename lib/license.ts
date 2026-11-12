import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { isIP } from "node:net";
import { env, isLicenseGateEnabled } from "@/lib/env";
import { all, get, run, tx } from "@/lib/sqlite";

// ───────────────────────────────────────────────────────────────
// License gate for POST /api/generate.
//
// Three ways to be entitled to download the FULL source ZIP:
//   1. An offline, HMAC-signed license key (issued after a Waffo payment).
//      Self-verifying — no DB lookup needed, works even on serverless.
//   2. A signed-in buyer with an active subscription row, or a license
//      record matching their email (auto-claim on login).
//   3. Gate OFF (development / a generated customer project).
//
// Anonymous visitors get NO full ZIP. The generator IS the product: a
// download is the product. They can still take a free PREVIEW (the file
// inventory + the theme tokens, never application source) — see
// checkPreviewEntitlement and lib/generator/preview.ts.
//
// Records are written to Supabase when configured, otherwise to the local
// SQLite database under `.data/`. The KEY itself never depends on either
// store, so a read-only filesystem cannot lock out paying customers.
// ───────────────────────────────────────────────────────────────

export const LICENSE_COOKIE = "sk_license";
export const LICENSE_HEADER = "x-shipkit-license";
/** Signed, httpOnly cookie that carries the anonymous preview identity. */
export const TRIAL_COOKIE = "sk_trial";

/** Buyout keys ship with 12 months of free source updates, then Care. */
export const BUYOUT_UPDATE_WINDOW_SECONDS = 365 * 24 * 3600;

export type LicensePayload = {
  v: 1;
  jti: string;
  email?: string;
  plan: "buyout" | "care";
  orderId?: string;
  iat: number; // seconds
  exp?: number; // seconds; absent = lifetime (Buyout)
  /** Seconds; the window during which UPDATED source may be downloaded.
   *  Buyout keys get a 12-month window at issuance; Care pushes it out to the
   *  subscription period end. Absent = legacy key (grandfathered as lifetime). */
  updatesUntil?: number;
};

export type LicenseRecord = {
  jti: string;
  key: string;
  email?: string;
  plan: "buyout" | "care";
  orderId?: string;
  createdAt: string;
  expiresAt?: string | null;
  /** ISO timestamp; window during which updated source downloads are allowed.
   *  Buyout = issued + 12 months; Care = current period end. null = legacy. */
  updatesUntil?: string | null;
};

export type EntitlementReason =
  | "gate-off"
  | "license-key"
  | "license-email"
  | "subscription"
  | "free-preview"
  | "update-window-expired"
  | "care-requires-buyout"
  | "denied";

export type Entitlement = {
  allowed: boolean;
  reason: EntitlementReason;
  plan?: "buyout" | "care";
  remaining?: number;
  /** Present when a specific issued key backs the entitlement (delivery log). */
  jti?: string;
  /** Buyer email, hashed before it is written to delivery_events. */
  email?: string;
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

// ── Store: Supabase when configured, local SQLite otherwise ────────────────
//
// The local store is a single SQLite database (.data/shipkit.db) instead of a
// pile of JSON files: transactions keep the free-quota counter correct under
// concurrent requests, and the admin console can query it directly.

type LicenseRow = {
  jti: string;
  key: string;
  email: string | null;
  plan: string;
  order_id: string | null;
  created_at: string;
  expires_at: string | null;
  updates_until: string | null;
};

function rowToLicense(r: LicenseRow): LicenseRecord {
  // The column is free-form text (the legacy JSON store could hold anything);
  // the record type only knows the two shipped plans.
  const plan: LicenseRecord["plan"] = r.plan === "care" ? "care" : "buyout";
  return {
    jti: r.jti,
    key: r.key,
    email: r.email ?? undefined,
    plan,
    orderId: r.order_id ?? undefined,
    createdAt: r.created_at,
    expiresAt: r.expires_at ?? null,
    updatesUntil: r.updates_until ?? null,
  };
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

  // Update window: Buyout = 12 months from issuance; Care = the period end.
  const updatesUntilSec =
    params.plan === "buyout"
      ? now + BUYOUT_UPDATE_WINDOW_SECONDS
      : (exp ?? undefined);
  const updatesUntilIso = updatesUntilSec
    ? new Date(updatesUntilSec * 1000).toISOString()
    : null;

  const payload: LicensePayload = {
    v: 1,
    jti: randomUUID(),
    email: params.email?.toLowerCase() || undefined,
    plan: params.plan,
    orderId: params.orderId,
    iat: now,
    ...(exp ? { exp } : {}),
    ...(updatesUntilSec ? { updatesUntil: updatesUntilSec } : {}),
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
    updatesUntil: updatesUntilIso,
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
      updates_until: record.updatesUntil ?? null,
    });
    if (!error) {
      // A Care grant extends any Buyout update window for this email.
      if (params.plan === "care" && record.updatesUntil) {
        await extendUpdatesForEmail(record.email, record.updatesUntil);
      }
      return record;
    }
    console.warn("license insert fell back to local store:", error.message);
  }
  run(
    `INSERT OR IGNORE INTO licenses (jti, key, email, plan, order_id, created_at, expires_at, updates_until)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    record.jti,
    record.key,
    record.email ?? null,
    record.plan,
    record.orderId ?? null,
    record.createdAt,
    record.expiresAt ?? null,
    record.updatesUntil ?? null,
  );
  if (params.plan === "care" && record.updatesUntil) {
    await extendUpdatesForEmail(record.email, record.updatesUntil);
  }
  return record;
}

/** Look up a single license record by its key id (jti). */
export async function getLicenseRecordByJti(
  jti: string,
): Promise<LicenseRecord | null> {
  const db = await adminClient();
  if (db) {
    const { data } = await db
      .from("licenses")
      .select("*")
      .eq("jti", jti)
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
        updatesUntil: data.updates_until ?? null,
      } as LicenseRecord;
    }
  }
  const row = get<LicenseRow>("SELECT * FROM licenses WHERE jti = ?", jti);
  return row ? rowToLicense(row) : null;
}

/**
 * When an active Care subscription is granted, push the buyer's Buyout update
 * window out to the Care period end — so Care genuinely "continues updates".
 * Only ever EXTENDS (never shortens) the stored window.
 */
export async function extendUpdatesForEmail(
  email: string | undefined,
  untilIso: string,
): Promise<void> {
  if (!email) return;
  const normalized = email.toLowerCase();
  const db = await adminClient();
  if (db) {
    const { error } = await db
      .from("licenses")
      .update({ updates_until: untilIso })
      .eq("email", normalized)
      .eq("plan", "buyout")
      .or(`updates_until.is.null,updates_until.lt.${untilIso}`);
    if (error) console.warn("extendUpdatesForEmail failed:", error.message);
    return;
  }
  run(
    `UPDATE licenses SET updates_until = ?
     WHERE email = ? AND plan = 'buyout'
       AND (updates_until IS NULL OR updates_until < ?)`,
    untilIso,
    normalized,
    untilIso,
  );
}

/** Auto-claim: a signed-in buyer whose email matches an issued license.
 *  Prefers a Buyout row over a later Care row — Care alone is not a source
 *  license, and a buyout owner who also pays Care must keep downloading
 *  under the plan they actually bought. */
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
      .limit(10);
    const rows: any[] = data || [];
    const pick = rows.find((r) => r.plan === "buyout") || rows[0];
    if (pick) {
      return {
        jti: pick.jti,
        key: pick.key,
        email: pick.email ?? undefined,
        plan: pick.plan,
        orderId: pick.order_id ?? undefined,
        createdAt: pick.created_at,
        expiresAt: pick.expires_at ?? null,
        updatesUntil: pick.updates_until ?? null,
      } as LicenseRecord;
    }
  }
  const row =
    get<LicenseRow>(
      "SELECT * FROM licenses WHERE email = ? AND plan = 'buyout' ORDER BY created_at DESC LIMIT 1",
      normalized,
    ) ??
    get<LicenseRow>(
      "SELECT * FROM licenses WHERE email = ? ORDER BY created_at DESC LIMIT 1",
      normalized,
    );
  if (!row) return null;
  const found = rowToLicense(row);
  if (found.expiresAt && Date.parse(found.expiresAt) < Date.now()) return null;
  const payload = verifyLicenseKey(found.key);
  return payload ? found : null;
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
        updatesUntil: r.updates_until ?? null,
      }));
    }
  }
  return all<LicenseRow>(
    "SELECT * FROM licenses ORDER BY created_at DESC LIMIT 50",
  ).map(rowToLicense);
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
  const changes = run(
    `INSERT OR IGNORE INTO webhook_events (id, event_type, event_id, created_at)
     VALUES (?, ?, ?, ?)`,
    id,
    eventType,
    eventId,
    new Date().toISOString(),
  );
  return changes > 0;
}

// ── Client network ─────────────────────────────────────────────────────────
//
// The old implementation hashed the FIRST x-forwarded-for value, which any
// client can set to anything — one header rotation was enough to mint a
// fresh free quota forever. The rules below only trust values that a PROXY
// controls, and fall back to a shared bucket when nothing trustworthy
// exists. The preview quota is counted TWICE (visitor token AND network),
// so defeating one bucket is never enough on its own.

// A process-local fallback key, used only when LICENSE_SECRET is missing
// (a misconfigured production install). Tokens signed with it still cannot
// be forged from the outside; they simply stop surviving a restart.
let fallbackTrialSecret: string | null = null;

function trialSecret(): string {
  const configured = env.licenseSecret();
  if (configured) return configured;
  if (!fallbackTrialSecret) fallbackTrialSecret = randomBytes(32).toString("hex");
  return fallbackTrialSecret;
}

/** Normalise a raw IP candidate (strips ports, rejects non-IPs). */
function normalizeIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let v = raw.trim().toLowerCase();
  if (!v) return null;
  if (v.startsWith("[")) {
    const end = v.indexOf("]");
    if (end > 0) v = v.slice(1, end);
  } else if (v.includes(":") && isIP(v) === 0) {
    const head = v.split(":")[0];
    if (isIP(head) === 4) v = head;
  }
  return isIP(v) ? v : null;
}

/** True when the address is routable on the public internet. */
function isPublicIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 169 && b === 254) return false;
    if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
    if (a >= 224) return false; // multicast + reserved
    return true;
  }
  if (isIP(ip) === 6) {
    if (ip === "::" || ip === "::1") return false;
    if (ip.startsWith("fc") || ip.startsWith("fd")) return false; // ULA
    if (ip.startsWith("fe80")) return false; // link-local
    if (ip.startsWith("::ffff:")) return isPublicIp(ip.slice(7));
    return true;
  }
  return false;
}

/**
 * The network a request came from.
 *
 * Trusted sources first (a platform/proxy OVERWRITES them, so a client
 * cannot forge them in front of that platform):
 *   1. cf-connecting-ip       — Cloudflare
 *   2. x-vercel-forwarded-for — Vercel
 *   3. x-real-ip              — the usual nginx convention ($remote_addr)
 * Then x-forwarded-for, but only when the chain has more than one public
 * hop: a proxy APPENDS the real client IP, so the tail is the honest one.
 * A single-entry x-forwarded-for was written by the client itself and is
 * therefore ignored — those requests share one "global" bucket.
 */
export function clientNetwork(req: Request): string {
  for (const header of [
    "cf-connecting-ip",
    "x-vercel-forwarded-for",
    "x-real-ip",
  ]) {
    const ip = normalizeIp(req.headers.get(header));
    if (ip && isPublicIp(ip)) return ip;
  }
  const chain = (req.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => normalizeIp(s))
    .filter((s): s is string => !!s)
    .filter(isPublicIp);
  if (chain.length >= 2) return chain[chain.length - 1];
  return "global";
}

// ── Anonymous preview token ────────────────────────────────────────────────
//
// A signed, httpOnly, first-party token. It carries no personal data — it
// exists so the preview quota can be counted per visitor even when several
// people share one IP, and so the quota survives a cookie-less attacker
// resetting their browser state.

const TRIAL_TOKEN_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

/** Mint a new, signed preview token: the stable id plus the cookie value. */
export function issueTrialToken(): { id: string; cookie: string } {
  const id = randomUUID();
  const body = b64url(
    JSON.stringify({ id, iat: Math.floor(Date.now() / 1000) }),
  );
  return { id, cookie: `T1.${body}.${mac(body, trialSecret())}` };
}

/** Read + verify the preview token from the request cookies. */
function readTrialToken(req: Request): { id: string; cookie: string } | null {
  const raw = cookieValue(req, TRIAL_COOKIE);
  if (!raw) return null;
  const parts = raw.trim().split(".");
  if (parts.length !== 3 || parts[0] !== "T1") return null;
  const [, body, sig] = parts;
  if (!safeEqual(mac(body, trialSecret()), sig)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as { id?: string; iat?: number };
    if (!payload?.id) return null;
    const age = Math.floor(Date.now() / 1000) - Number(payload.iat ?? 0);
    if (!Number.isFinite(age) || age < 0 || age > TRIAL_TOKEN_MAX_AGE) {
      return null;
    }
    return { id: payload.id, cookie: raw };
  } catch {
    return null;
  }
}

/**
 * The preview identity for a request: the verified token, or a freshly
 * minted one. The caller must persist a new token in the response cookie.
 *
 * `id` is the STABLE identity used for quota accounting — it is the same
 * for the request that mints the token and for every later request that
 * replays the cookie. `cookie` is the value to hand to the browser.
 */
export function ensureTrialToken(req: Request): {
  id: string;
  cookie: string;
  isNew: boolean;
} {
  const existing = readTrialToken(req);
  if (existing) return { id: existing.id, cookie: existing.cookie, isNew: false };
  const fresh = issueTrialToken();
  return { id: fresh.id, cookie: fresh.cookie, isNew: true };
}

// ── Free preview quota ─────────────────────────────────────────────────────

function quotaKey(prefix: string, value: string): string {
  const digest = createHash("sha256").update(value).digest("hex").slice(0, 24);
  return `${prefix}:${digest}`;
}

/**
 * Consume one anonymous preview slot.
 *
 * Two independent buckets must both have capacity:
 *   • the visitor token  — survives cookie clearing only if the token is
 *     still presented, so a cleared cookie yields a NEW token bucket;
 *   • the network        — survives token rotation only if the request
 *     still comes from the same trusted address.
 * Counting both means neither "clear the cookies" nor "rotate a header" is
 * enough on its own to keep generating previews forever.
 */
async function consumeFreeQuota(req: Request, token: string): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  const limit = env.freeGenerationsPerDay();
  if (limit <= 0) return { allowed: false, remaining: 0 };
  const networkLimit = env.freeGenerationsPerNetworkPerDay();
  const day = new Date().toISOString().slice(0, 10);
  const tokenKey = quotaKey("t", token);
  const networkKey = quotaKey("n", clientNetwork(req));

  return tx(() => {
    const usedFor = (key: string): number => {
      const row = get<{ day: string; used: number }>(
        "SELECT day, used FROM quota WHERE ip_key = ?",
        key,
      );
      return row?.day === day ? Number(row.used) : 0;
    };
    const tokenUsed = usedFor(tokenKey);
    const networkUsed = usedFor(networkKey);
    if (tokenUsed >= limit || networkUsed >= networkLimit) {
      return { allowed: false, remaining: 0 };
    }

    const bump = (key: string, next: number) =>
      run(
        `INSERT INTO quota (ip_key, day, used) VALUES (?, ?, ?)
         ON CONFLICT(ip_key) DO UPDATE SET used = ?, day = excluded.day`,
        key,
        day,
        next,
        next,
      );
    bump(tokenKey, tokenUsed + 1);
    if (networkKey !== tokenKey) bump(networkKey, networkUsed + 1);

    // Keep the table from growing unbounded (30-day retention).
    const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);
    run("DELETE FROM quota WHERE day < ?", cutoff);
    return { allowed: true, remaining: Math.max(limit - tokenUsed - 1, 0) };
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

/**
 * Whether a Buyout key/record still permits downloading UPDATED source.
 * The source is owned forever (exp is undefined); this only gates the
 * 12-month free-update window. Care re-opens the window by extending the
 * stored updates_until. Legacy keys (no updatesUntil) are grandfathered.
 */
async function buyoutUpdatesAllowed(p: {
  updatesUntilSec?: number | null;
  updatesUntilIso?: string | null;
  email?: string;
  jti?: string;
}): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  let untilSec: number | null =
    p.updatesUntilSec ??
    (p.updatesUntilIso ? Math.floor(Date.parse(p.updatesUntilIso) / 1000) : null);
  // The stored record may have been extended by an active Care grant.
  if (!untilSec && p.jti) {
    const rec = await getLicenseRecordByJti(p.jti);
    if (rec?.updatesUntil) untilSec = Math.floor(Date.parse(rec.updatesUntil) / 1000);
  }
  if (!untilSec) return true; // grandfather: legacy key, no window
  return untilSec >= now;
}

export async function checkEntitlement(
  req: Request,
  explicitKey?: string,
): Promise<Entitlement> {
  if (!isLicenseGateEnabled()) {
    return { allowed: true, reason: "gate-off" };
  }

  // 1. Offline license key — no DB required.
  const key = licenseKeyFromRequest(req, explicitKey);
  if (key) {
    const payload = verifyLicenseKey(key);
    if (payload) {
      // Care is NOT a source license: it re-opens a Buyout holder's update
      // window (see syncSubscriptionGrant) and buys support. Without a
      // Buyout on the account, a Care key can never unlock the full ZIP —
      // otherwise subscribe($13) → download → cancel would replace the
      // $249 purchase outright.
      if (payload.plan === "care") {
        return {
          allowed: false,
          reason: "care-requires-buyout",
          plan: "care",
          jti: payload.jti,
          email: payload.email,
        };
      }
      // Buyout keys gate the 12-month free-update window here.
      if (
        payload.plan === "buyout" &&
        !(await buyoutUpdatesAllowed({
          updatesUntilSec: payload.updatesUntil ?? null,
          email: payload.email,
          jti: payload.jti,
        }))
      ) {
        return {
          allowed: false,
          reason: "update-window-expired",
          plan: "buyout",
          email: payload.email,
        };
      }
      return {
        allowed: true,
        reason: "license-key",
        plan: payload.plan,
        jti: payload.jti,
        email: payload.email,
      };
    }
  }

  // 2. Signed-in buyer: a Buyout entitlement only. A lone Care subscription
  //    does NOT unlock the source (same subscribe→cancel hole as the key
  //    path); Care re-opens the update window of a Buyout the email owns,
  //    which the license-email branch below resolves.
  try {
    const { getCurrentUser, getSubscription } = await import(
      "@/lib/subscriptions"
    );
    const user = await getCurrentUser();
    if (user) {
      const sub = await getSubscription(user.id);
      if (
        sub &&
        sub.plan === "buyout" &&
        (sub.status === "active" || sub.status === "trialing")
      ) {
        return {
          allowed: true,
          reason: "subscription",
          plan: "buyout",
          email: user.email,
        };
      }
      const owned = await findLicenseByEmail(user.email);
      if (owned) {
        // Care-only claim: support + window re-open, no source download.
        if (owned.plan === "care") {
          return {
            allowed: false,
            reason: "care-requires-buyout",
            plan: "care",
            email: owned.email,
          };
        }
        // Buyout key claimed by email also gates the 12-month window.
        if (
          owned.plan === "buyout" &&
          !(await buyoutUpdatesAllowed({
            updatesUntilIso: owned.updatesUntil ?? null,
            email: owned.email,
            jti: owned.jti,
          }))
        ) {
          return {
            allowed: false,
            reason: "update-window-expired",
            plan: "buyout",
            email: owned.email,
          };
        }
        return {
          allowed: true,
          reason: "license-email",
          plan: owned.plan,
          jti: owned.jti,
          email: owned.email,
        };
      }
    }
  } catch {
    // Supabase not configured / session read failed → fall through.
  }

  // 3. No paid entitlement. An anonymous visitor never receives the full
  //    source ZIP — the download IS the product. They can take a free
  //    preview instead (checkPreviewEntitlement).
  return { allowed: false, reason: "denied", remaining: 0 };
}

/**
 * Entitlement for the FREE PREVIEW (file inventory + theme tokens, never
 * application source). Anonymous visitors only — a paid customer does not
 * need this path. The quota is counted per signed visitor token AND per
 * trusted network, so neither clearing cookies nor rotating a header is
 * enough to keep downloading previews forever.
 */
export async function checkPreviewEntitlement(
  req: Request,
  tokenId: string,
): Promise<Entitlement> {
  if (!isLicenseGateEnabled()) {
    return { allowed: true, reason: "gate-off" };
  }
  const quota = await consumeFreeQuota(req, tokenId);
  if (quota.allowed) {
    return {
      allowed: true,
      reason: "free-preview",
      remaining: quota.remaining,
    };
  }
  return { allowed: false, reason: "denied", remaining: 0 };
}
