import { NextResponse } from "next/server";
import { runRetention } from "@/lib/legal-lifecycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Scheduled data-retention job. Wire to a scheduler with CRON_SECRET. */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  return (req.headers.get("authorization") ?? "") === `Bearer ${secret}`;
}

async function run(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const days = Math.min(
    Math.max(Number(url.searchParams.get("days") ?? 90) || 90, 1),
    3650,
  );
  const report = runRetention(days);
  return NextResponse.json({ ok: true, days, ...report });
}

// Vercel Cron calls the path with GET + `Authorization: Bearer $CRON_SECRET`;
// POST stays for manual / GitHub-Actions triggers.
export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}
