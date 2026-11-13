import { all, get, run } from "@/lib/sqlite";
import { logger } from "@/lib/logger";

// A tiny, privacy-friendly, first-party pageview counter for the marketing
// site. It stores an aggregate map of path -> count. In production (a service
// role key configured) the count lives in the `pageviews` table so it survives
// serverless instances / restarts. Without Supabase it falls back to the local
// SQLite database (.data/app.db) — dev only, not durable on ephemeral FS.

export type Stats = {
  total: number;
  pages: Record<string, number>;
  updatedAt: string;
};

const EMPTY: Stats = { total: 0, pages: {}, updatedAt: new Date(0).toISOString() };

type PageviewRow = { path: string; count: number; updated_at: string };

function hasServiceRole(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// ── Local SQLite (dev / no Supabase) ─────────────────────────

function readLocal(): Stats {
  const rows = all<PageviewRow>(
    "SELECT path, count, updated_at FROM pageviews ORDER BY path",
  );
  const pages: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    const n = Number(r.count) || 0;
    pages[r.path] = n;
    total += n;
  }
  return {
    total,
    pages,
    updatedAt: rows[0]?.updated_at ?? new Date(0).toISOString(),
  };
}

function writeLocal(pathKey: string): void {
  run(
    `INSERT INTO pageviews (path, count, updated_at) VALUES (?, 1, ?)
     ON CONFLICT(path) DO UPDATE SET count = count + 1, updated_at = excluded.updated_at`,
    pathKey,
    new Date().toISOString(),
  );
}

// ── Supabase-backed (production) ────────────────────────────
async function readSupabase(): Promise<Stats> {
  try {
    const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const db = createSupabaseAdminClient();
    const { data, error } = await db.from("pageviews").select("path, count");
    if (error) throw error;
    const pages: Record<string, number> = {};
    let total = 0;
    for (const r of data ?? []) {
      pages[r.path] = Number(r.count) || 0;
      total += pages[r.path];
    }
    return { total, pages, updatedAt: new Date().toISOString() };
  } catch (err) {
    logger.warn("stats read fell back to local", { err: (err as Error).message });
    return readLocal();
  }
}

async function writeSupabase(pathKey: string): Promise<void> {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const db = createSupabaseAdminClient();
  // Primary: atomic increment RPC (migration 0006). On a missing RPC (older
  // schema) fall back to a read-modify-write upsert.
  const { error } = await db.rpc("increment_pageview", { p_path: pathKey });
  if (!error) return;
  const { data } = await db
    .from("pageviews")
    .select("count")
    .eq("path", pathKey)
    .maybeSingle();
  const next = ((data?.count as number) ?? 0) + 1;
  await db
    .from("pageviews")
    .upsert(
      { path: pathKey, count: next, updated_at: new Date().toISOString() },
      { onConflict: "path" },
    );
}

/** Record a single pageview for `path` (e.g. "/", "/pricing", "/blog/x"). */
export async function recordPageview(p: string): Promise<void> {
  const pathKey = (p.split("?")[0] || "/").slice(0, 200);
  try {
    if (hasServiceRole()) {
      await writeSupabase(pathKey);
    } else {
      writeLocal(pathKey);
    }
  } catch (err) {
    logger.warn("recordPageview failed", { path: pathKey, err: (err as Error).message });
    /* never block the request on analytics */
  }
}

/** Return the current aggregate stats (sorted pages). */
export async function getStats(): Promise<Stats> {
  try {
    return hasServiceRole() ? await readSupabase() : readLocal();
  } catch (err) {
    logger.warn("getStats failed", { err: (err as Error).message });
    return { ...EMPTY, pages: {} };
  }
}

/** Whether the counter is backed by Supabase (vs the local SQLite file). */
export function statsAreDurable(): boolean {
  return hasServiceRole();
}
