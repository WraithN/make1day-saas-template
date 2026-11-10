// Monthly video credits for the studio module. Subscription-only by product
// decision: Care = 6 credits/month; one-time Buyout does NOT include credits.
// Resolution trades credits instead of money: 480p=1, 720p=2, 1080p=5
// (COGS-backed, see docs/video-product.md §4).

export const CREDITS_PER_MONTH = 6;

export const COST_BY_RESOLUTION: Record<string, number> = {
  "480p": 1,
  "720p": 2,
  "1080p": 5,
};

export function monthKey(d = new Date()): string {
  return d.toISOString().slice(0, 7);
}

export function costOf(resolution: string): number {
  return COST_BY_RESOLUTION[resolution] ?? COST_BY_RESOLUTION["480p"];
}

type Backend = {
  read(userId: string, month: string): Promise<number>;
  add(userId: string, month: string, cost: number): Promise<number>;
};

async function backend(): Promise<Backend> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const role = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (url && role) {
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(url, role, { auth: { persistSession: false } });
    const read = async (userId: string, month: string) => {
      const { data } = await admin
        .from("video_usage")
        .select("used")
        .eq("user_id", userId)
        .eq("month", month)
        .maybeSingle();
      return (data?.used as number) ?? 0;
    };
    const add = async (userId: string, month: string, cost: number) => {
      const used = (await read(userId, month)) + cost;
      await admin.from("video_usage").upsert({ user_id: userId, month, used });
      return used;
    };
    return { read, add };
  }
  const { getDb } = await import("@/lib/sqlite");
  const read = async (userId: string, month: string) => {
    const row = getDb()
      .prepare("SELECT used FROM video_usage WHERE user_id = ? AND month = ?")
      .get(userId, month) as { used: number } | undefined;
    return row?.used ?? 0;
  };
  const add = async (userId: string, month: string, cost: number) => {
    getDb()
      .prepare(
        "INSERT INTO video_usage (user_id, month, used) VALUES (?, ?, ?) ON CONFLICT (user_id, month) DO UPDATE SET used = used + ?"
      )
      .run(userId, month, cost, cost);
    return read(userId, month);
  };
  return { read, add };
}

export async function creditsUsed(userId: string): Promise<number> {
  return (await backend()).read(userId, monthKey());
}

/** Returns 429-shaped info when the monthly budget is exhausted. */
export async function consumeCredits(
  userId: string,
  cost: number,
): Promise<{ ok: boolean; used: number; limit: number }> {
  const be = await backend();
  const used = await be.read(userId, monthKey());
  if (used + cost > CREDITS_PER_MONTH) {
    return { ok: false, used, limit: CREDITS_PER_MONTH };
  }
  const next = await be.add(userId, monthKey(), cost);
  return { ok: true, used: next, limit: CREDITS_PER_MONTH };
}

/** Refund on provider failure — credits must never vanish with a dead job. */
export async function refundCredits(userId: string, cost: number) {
  const be = await backend();
  const used = Math.max(0, (await be.read(userId, monthKey())) - cost);
  const month = monthKey();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const role = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (url && role) {
    const { createClient } = await import("@supabase/supabase-js");
    await createClient(url, role, { auth: { persistSession: false } })
      .from("video_usage")
      .upsert({ user_id: userId, month, used });
    return;
  }
  const { getDb } = await import("@/lib/sqlite");
  getDb()
    .prepare(
      "INSERT INTO video_usage (user_id, month, used) VALUES (?, ?, ?) ON CONFLICT (user_id, month) DO UPDATE SET used = ?"
    )
    .run(userId, month, used, used);
}
