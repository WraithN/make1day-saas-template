import { promises as fs } from "fs";
import path from "path";

// A tiny, privacy-friendly, first-party pageview counter for the marketing
// site. It stores an aggregate map of path -> count in a JSON file under
// `.data/`. This is a starter: in production you'd swap it for a managed
// analytics service (GA4, Plausible, Umami) — see components/Analytics.tsx.

type Stats = {
  total: number;
  pages: Record<string, number>;
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "site-stats.json");

const EMPTY: Stats = { total: 0, pages: {}, updatedAt: new Date(0).toISOString() };

async function read(): Promise<Stats> {
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

async function write(stats: Stats): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(stats), "utf8");
}

/** Record a single pageview for `path` (e.g. "/", "/pricing", "/blog/x"). */
export async function recordPageview(p: string): Promise<void> {
  try {
    const pathKey = p.split("?")[0] || "/";
    const stats = await read();
    stats.total += 1;
    stats.pages[pathKey] = (stats.pages[pathKey] ?? 0) + 1;
    stats.updatedAt = new Date().toISOString();
    await write(stats);
  } catch {
    /* never block the request on analytics */
  }
}

/** Return the current aggregate stats (sorted pages). */
export async function getStats(): Promise<Stats> {
  const stats = await read();
  return stats;
}
