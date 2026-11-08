import { NextResponse } from "next/server";
import { guardApiWrite } from "@/lib/http-guard";
import { getCurrentUser } from "@/lib/subscriptions";
import { exportUserData } from "@/lib/legal-lifecycle";
import { recordConsentEvent } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Data-subject access request. Only the signed-in owner may export. */
export async function POST(req: Request) {
  const blocked = await guardApiWrite(req, {
    bucket: "privacy-export",
    limit: 5,
    windowMs: 3600_000,
  });
  if (blocked) return blocked;

  const user = await getCurrentUser();
  const email = user?.email?.toLowerCase() ?? null;
  if (!email) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }

  const payload = await exportUserData(email);
  recordConsentEvent(email, "export", "privacy-v1", payload.backend);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="my-data.json"',
      "Cache-Control": "no-store",
    },
  });
}
