import { promises as fs } from "fs";
import path from "path";
import { logger } from "@/lib/logger";

// A tiny, privacy-friendly, first-party pageview counter for the marketing
// site. It stores an aggregate map of path -> count. In production (a service
// role key configured) the count lives in the `pageviews` table so it survives
// serverless instances / restarts. Without Supabase it falls back to a local
// JSON file under `.data/` (dev only — not durable on ephemeral FS).

export type Stats = {
  total: number;
  pages: Record<string, number>;
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "site-stats.json");

const EMPTY: Stats = { total: 0, pages: {}, updatedAt: new Date(0).toISOString() };

function hasServiceRole(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// ── Local JSON fallback (dev / no Supabase) ──────────────────
async function readLocal(): Promise<Stats> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as Stats;
    return {
      total: parsed.total ?? 0,
      pages: parsed.pages ?? {},
      updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
    };
  } catch {
    return { ...EMPTY, pages: {} };
  }
}

async function writeLocal(stats: Stats): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(stats), "utf8");
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
      const stats = await readLocal();
      stats.total += 1;
      stats.pages[pathKey] = (stats.pages[pathKey] ?? 0) + 1;
      stats.updatedAt = new Date().toISOString();
      await writeLocal(stats);
    }
  } catch (err) {
    logger.warn("recordPageview failed", { path: pathKey, err: (err as Error).message });
    /* never block the request on analytics */
  }
}

/** Return the current aggregate stats (sorted pages). */
export async function getStats(): Promise<Stats> {
  try {
    return hasServiceRole() ? await readSupabase() : await readLocal();
  } catch (err) {
    logger.warn("getStats failed", { err: (err as Error).message });
    return { ...EMPTY, pages: {} };
  }
}
