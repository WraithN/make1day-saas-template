import { NextResponse } from "next/server";
import { mailConfigStatus } from "@/lib/mail/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/mail/self-check — read-only CONFIGURATION STATE ONLY.
 * Never returns an API key, webhook URL/token or any other secret value.
 * Open it before going live: ready=true and warnings=[] means mail can be
 * delivered. A provider of "none" is intentionally degraded (logged only).
 */
export function GET() {
  const status = mailConfigStatus();
  return NextResponse.json({
    ...status,
    docs: "docs/email.md",
    note: "Configuration state only — no secret values are ever returned. Code only sends mail; deliverability depends on your DNS (SPF / DKIM / DMARC), not on this endpoint.",
  });
}
