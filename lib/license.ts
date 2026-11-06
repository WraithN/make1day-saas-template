import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { env, isLicenseGateEnabled } from "@/lib/env";
import { all, get, run, tx } from "@/lib/sqlite";

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
// Records are written to Supabase when configured, otherwise to the local
// SQLite database under `.data/`. The KEY itself never depends on either
// store, so a read-only filesystem cannot lock out paying customers.
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
  run(
    `INSERT OR IGNORE INTO licenses (jti, key, email, plan, order_id, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    record.jti,
    record.key,
    record.email ?? null,
    record.plan,
    record.orderId ?? null,
    record.createdAt,
    record.expiresAt ?? null,
  );
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
  const row = get<LicenseRow>(
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
  return tx(() => {
    const row = get<{ day: string; used: number }>(
      "SELECT day, used FROM quota WHERE ip_key = ?",
      key,
    );
    const used = row?.day === day ? Number(row.used) : 0;
    if (used >= limit) return { allowed: false, remaining: 0 };
    run(
      `INSERT INTO quota (ip_key, day, used) VALUES (?, ?, 1)
       ON CONFLICT(ip_key) DO UPDATE SET used = ?, day = excluded.day`,
      key,
      day,
      used + 1,
    );
    // Keep the table from growing unbounded (30-day retention).
    const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);
    run("DELETE FROM quota WHERE day < ?", cutoff);
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
