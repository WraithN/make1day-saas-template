import { NextResponse } from "next/server";
import { guardApiWrite } from "@/lib/http-guard";
import { recordErrorEvent } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Client-side error collector used by app/error.tsx and global-error.tsx. */
export async function POST(req: Request) {
  const blocked = await guardApiWrite(req, {
    bucket: "error-report",
    limit: 30,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({}));
  const message =
    typeof body?.message === "string" ? body.message.slice(0, 500) : "client error";
  const level = body?.level === "warn" ? "warn" : "error";
  recordErrorEvent(level, message, {
    source: "client",
    url: typeof body?.url === "string" ? body.url.slice(0, 300) : undefined,
    digest: typeof body?.digest === "string" ? body.digest.slice(0, 200) : undefined,
  });
  return NextResponse.json({ ok: true });
}
