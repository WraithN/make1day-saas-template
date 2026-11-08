// Per-user, per-day quota for the AI chat endpoint.
//
// Every authenticated AI request consumes one unit from the caller's daily
// budget (AI_MESSAGES_PER_DAY, default 50). The counter is keyed by the
// Supabase user id and resets when the UTC day changes, so a customer who
// subscribes to a Care plan cannot burn through the whole LLM bill in one
// afternoon.
//
// Storage mirrors the rest of make1day: Supabase when a service-role key is
// configured (production), the local SQLite database otherwise (dev /
// self-hosted). Switching backends is an env change, not a code change.
//
// The decrement is ATOMIC on both backends, so two requests that arrive at
// the same time can never both take the last remaining slot:
//   * SQLite   — one IMMEDIATE transaction around read + write (see tx()).
//   * Supabase — a plpgsql function that locks the row before it updates it
//     (supabase/migrations/0009_ai_usage.sql → consume_ai_usage).

import { all, get, run, tx } from "@/lib/sqlite";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export type AiQuotaState = {
  /** The user the counter belongs to. */
  userId: string;
  /** The UTC day (YYYY-MM-DD) the counters belong to. */
  day: string;
  /** Units consumed on that day. */
  used: number;
  /** The daily budget. */
  limit: number;
  /** Units still available (0 once the budget is exhausted). */
  remaining: number;
  /** Whether the request may proceed. */
  allowed: boolean;
};

export type AiUsageSummary = {
  /** The UTC day the numbers belong to. */
  day: string;
  /** The daily budget per user. */
  limit: number;
  /** Calls consumed today, across every user. */
  calls: number;
  /** Users that consumed at least one call today. */
  activeUsers: number;
  /** True when the numbers come from the local SQLite file. */
  local: boolean;
};

/** The UTC day key a counter belongs to. Quotas reset at 00:00 UTC. */
export function utcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** The configured daily budget per user. */
export function aiUsageLimit(): number {
  return env.aiMessagesPerDay();
}

function hasServiceRole(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// ── Local SQLite ───────────────────────────────────────────────────────────

/**
 * Consume one unit inside a single IMMEDIATE transaction: the row is read,
 * compared against the budget and written back without another writer
 * slipping in between.
 */
function consumeLocal(userId: string, day: string, limit: number): AiQuotaState {
  return tx(() => {
    const row = get<{ day: string; used: number }>(
      "SELECT day, used FROM ai_usage WHERE user_id = ?",
      userId,
    );
    // A row from an earlier day starts over at zero.
    const used = row && row.day === day ? Number(row.used) || 0 : 0;

    if (used >= limit) {
      return {
        userId,
        day,
        used,
        limit,
        remaining: 0,
        allowed: false,
      };
    }

    const next = used + 1;
    run(
      `INSERT INTO ai_usage (user_id, day, used) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET used = excluded.used, day = excluded.day`,
      userId,
      day,
      next,
    );
    return {
      userId,
      day,
      used: next,
      limit,
      remaining: Math.max(0, limit - next),
      allowed: true,
    };
  });
}

function readTodayLocal(userId: string, day: string): number {
  const row = get<{ day: string; used: number }>(
    "SELECT day, used FROM ai_usage WHERE user_id = ?",
    userId,
  );
  if (!row || row.day !== day) return 0;
  return Number(row.used) || 0;
}

function summaryLocal(day: string): { calls: number; activeUsers: number } {
  const row = get<{ calls: number | null; users: number | null }>(
    `SELECT COALESCE(SUM(used), 0) AS calls, COUNT(*) AS users
       FROM ai_usage WHERE day = ? AND used > 0`,
    day,
  );
  return {
    calls: Number(row?.calls) || 0,
    activeUsers: Number(row?.users) || 0,
  };
}

// ── Supabase ───────────────────────────────────────────────────────────────

/**
 * Atomic consumption through the consume_ai_usage() RPC (migration 0009).
 * The function locks the row, so parallel requests are serialised.
 */
async function consumeSupabase(
  userId: string,
  day: string,
  limit: number,
): Promise<AiQuotaState> {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const db = createSupabaseAdminClient();
  const { data, error } = await db.rpc("consume_ai_usage", {
    p_user_id: userId,
    p_day: day,
    p_limit: limit,
  });
  if (error) {
    // A deployment that has not applied migration 0009 yet has the table but
    // not the function. Fall back to a read-modify-write upsert so the quota
    // still applies (the fallback is not atomic — the migration is).
    if (/consume_ai_usage|does not exist/i.test(error.message)) {
      logger.warn(
        "ai usage RPC missing — apply supabase/migrations/0009_ai_usage.sql",
        { err: error.message },
      );
      return consumeSupabaseFallback(userId, day, limit);
    }
    throw new Error(error.message);
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | { used?: number; allowed?: boolean }
    | null;
  const used = Number(row?.used) || 0;
  return {
    userId,
    day,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    allowed: row?.allowed !== false,
  };
}

/**
 * Atomic fallback for schemas without migration 0009's consume_ai_usage().
 *
 * A read-modify-write upsert used to live here; two concurrent requests could
 * both read the last free slot and both call the model. It now delegates to
 * the generic consume_rate_limit() RPC (migration 0011), which takes an
 * advisory lock. A 24h window aligned to the Unix epoch is exactly the UTC
 * day, so it matches the primary quota semantics. If that RPC is missing too,
 * we FAIL CLOSED rather than let an unmetered request reach a paid model.
 */
async function consumeSupabaseFallback(
  userId: string,
  day: string,
  limit: number,
): Promise<AiQuotaState> {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const db = createSupabaseAdminClient();

  const { data, error } = await db.rpc("consume_rate_limit", {
    p_bucket: `ai-usage:${userId}`,
    p_limit: limit,
    p_window_ms: 86_400_000,
  });
  if (error) {
    logger.error(
      "AI quota cannot be enforced atomically — apply migrations 0009 and 0011",
      { err: error.message },
    );
    return { userId, day, used: limit, limit, remaining: 0, allowed: false };
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | { allowed?: boolean; remaining?: number }
    | null;
  const remaining = Math.max(0, Number(row?.remaining) || 0);
  const used = Math.max(0, limit - remaining);
  const allowed = row?.allowed !== false;

  // Best-effort mirror for the admin dashboard only. The AUTHORITATIVE
  // decision above came from the atomic counter, so a stale mirror can never
  // grant an extra model call.
  try {
    await db
      .from("ai_usage")
      .upsert({ user_id: userId, day, used }, { onConflict: "user_id" });
  } catch {
    /* reporting-only */
  }

  return { userId, day, used, limit, remaining, allowed };
}

async function readTodaySupabase(userId: string, day: string): Promise<number> {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from("ai_usage")
    .select("day, used")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.day !== day) return 0;
  return Number(data.used) || 0;
}

async function summarySupabase(
  day: string,
): Promise<{ calls: number; activeUsers: number }> {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from("ai_usage")
    .select("user_id, used")
    .eq("day", day);
  if (error) throw new Error(error.message);

  let calls = 0;
  let activeUsers = 0;
  for (const r of data ?? []) {
    const used = Number(r.used) || 0;
    calls += used;
    if (used > 0) activeUsers += 1;
  }
  return { calls, activeUsers };
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Take one unit from the caller's daily budget.
 *
 * `allowed` is false once the budget is exhausted — the caller must then
 * refuse the request (HTTP 429) instead of calling the model.
 */
export async function consumeAiUsage(userId: string): Promise<AiQuotaState> {
  const day = utcDayKey();
  const limit = aiUsageLimit();

  if (hasServiceRole()) {
    try {
      return await consumeSupabase(userId, day, limit);
    } catch (err) {
      logger.warn("ai usage consume failed on Supabase", {
        err: (err as Error).message,
      });
      throw err;
    }
  }

  return consumeLocal(userId, day, limit);
}

/** How many calls this user made today, and how many are left. */
export async function getAiUsageToday(
  userId: string,
): Promise<{ day: string; used: number; limit: number; remaining: number }> {
  const day = utcDayKey();
  const limit = aiUsageLimit();

  let used = 0;
  if (hasServiceRole()) {
    try {
      used = await readTodaySupabase(userId, day);
    } catch (err) {
      logger.warn("ai usage read failed on Supabase", {
        err: (err as Error).message,
      });
      used = readTodayLocal(userId, day);
    }
  } else {
    used = readTodayLocal(userId, day);
  }

  return { day, used, limit, remaining: Math.max(0, limit - used) };
}

/** Today's totals across every user (for the admin console). */
export async function getAiUsageSummary(): Promise<AiUsageSummary> {
  const day = utcDayKey();
  const limit = aiUsageLimit();

  if (hasServiceRole()) {
    try {
      const totals = await summarySupabase(day);
      return { day, limit, ...totals, local: false };
    } catch (err) {
      logger.warn("ai usage summary failed on Supabase", {
        err: (err as Error).message,
      });
    }
  }

  const totals = summaryLocal(day);
  return { day, limit, ...totals, local: true };
}

/** Every recorded counter for the given day (admin debugging / exports). */
export async function listAiUsage(
  day: string = utcDayKey(),
): Promise<{ userId: string; used: number }[]> {
  if (hasServiceRole()) {
    const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const db = createSupabaseAdminClient();
    const { data, error } = await db
      .from("ai_usage")
      .select("user_id, used")
      .eq("day", day)
      .order("used", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      userId: String(r.user_id),
      used: Number(r.used) || 0,
    }));
  }

  return all<{ user_id: string; used: number }>(
    "SELECT user_id, used FROM ai_usage WHERE day = ? ORDER BY used DESC LIMIT 200",
    day,
  ).map((r) => ({ userId: r.user_id, used: Number(r.used) || 0 }));
}
