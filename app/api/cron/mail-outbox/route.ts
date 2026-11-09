import { NextResponse } from "next/server";
import { flushMailOutbox, outboxStats } from "@/lib/mail/outbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Retry endpoint for the durable mail queue. Wire it to a scheduler (Vercel
 * Cron, GitHub Actions, systemd timer) with `Authorization: Bearer $CRON_SECRET`.
 * Without CRON_SECRET it is open in development and CLOSED in production —
 * a fail-safe default, not an accidentally public operator endpoint.
 */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  return (req.headers.get("authorization") ?? "") === `Bearer ${secret}`;
}

async function flush(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? 20) || 20, 1),
    100,
  );
  const result = await flushMailOutbox(limit);
  return NextResponse.json({ ok: true, ...result, ...(await outboxStats()) });
}

// Vercel Cron calls the path with GET + `Authorization: Bearer $CRON_SECRET`,
// so GET must FLUSH the queue (stats-only GET would make cron a no-op).
// POST stays for manual / GitHub-Actions triggers.
export async function GET(req: Request) {
  return flush(req);
}

export async function POST(req: Request) {
  return flush(req);
}
