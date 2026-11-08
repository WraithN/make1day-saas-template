// Persistent, cross-instance rate limiting.
//
// The earlier implementations used process-local Maps, which reset on every
// deploy and let an attacker walk around the limit one replica at a time.
// Both backends now use an atomic read-modify-write:
//   * SQLite   — one IMMEDIATE transaction around read + write (see tx()).
//   * Supabase — the consume_rate_limit() plpgsql RPC in migration 0011.
// Switching backends is an env change, not a code change.

import { get, run, tx } from "@/lib/sqlite";
import { clientNetwork } from "@/lib/license";

type LimitRow = { window_key: string; used: number };

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
  limit: number;
};

function hasServiceRole(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Consume one slot in a fixed time window.
 *
 * `bucket` names the rule (e.g. "license-claim"), `identity` scopes it to a
 * client. Both are stored as-is; callers must hash any personal data first.
 */
export async function consumeRateLimit(
  bucket: string,
  identity: string,
  opts: { limit: number; windowMs: number },
): Promise<RateLimitResult> {
  const { limit, windowMs } = opts;
  const startMs = Math.floor(Date.now() / windowMs) * windowMs;
  const windowKey = new Date(startMs).toISOString();
  const retryAfter = Math.max(
    1,
    Math.ceil((startMs + windowMs - Date.now()) / 1000),
  );
  const id = `${bucket}:${identity}`;
  const now = new Date().toISOString();

  if (hasServiceRole()) {
    try {
      const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
      const { data, error } = await createSupabaseAdminClient().rpc(
        "consume_rate_limit",
        { p_bucket: id, p_limit: limit, p_window_ms: windowMs },
      );
      const row = Array.isArray(data) ? data[0] : data;
      if (!error && row) {
        return {
          allowed: row.allowed !== false,
          remaining: Number(row.remaining) || 0,
          retryAfter: Number(row.retry_after) || retryAfter,
          limit,
        };
      }
    } catch {
      // RPC missing (migration 0011 not applied yet) → local fallback below.
    }
  }

  return tx(() => {
    const row = get<LimitRow>(
      "SELECT window_key, used FROM rate_limits WHERE bucket = ?",
      id,
    );
    const used = row?.window_key === windowKey ? Number(row.used) : 0;
    if (used >= limit) {
      return { allowed: false, remaining: 0, retryAfter, limit };
    }
    run(
      `INSERT INTO rate_limits (bucket, window_key, used, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(bucket) DO UPDATE SET
         window_key = excluded.window_key,
         used = excluded.used,
         updated_at = excluded.updated_at`,
      id,
      windowKey,
      used + 1,
      now,
    );
    // Bound the table: keep two windows of history only.
    run(
      "DELETE FROM rate_limits WHERE updated_at < ?",
      new Date(Date.now() - Math.max(windowMs * 2, 3600_000)).toISOString(),
    );
    return {
      allowed: true,
      remaining: Math.max(0, limit - used - 1),
      retryAfter,
      limit,
    };
  });
}

/** Stable, non-forgeable-enough client identity built from trusted headers. */
export function requestIdentity(req: Request): string {
  return clientNetwork(req);
}
