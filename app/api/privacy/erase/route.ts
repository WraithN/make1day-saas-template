import { NextResponse } from "next/server";
import { guardApiWrite } from "@/lib/http-guard";
import { getCurrentUser } from "@/lib/subscriptions";
import { eraseUserData } from "@/lib/legal-lifecycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Erasure request. Requires a re-typed email so a stray click cannot wipe an
 * account, and only ever erases the signed-in subject's own address.
 */
export async function POST(req: Request) {
  const blocked = await guardApiWrite(req, {
    bucket: "privacy-erase",
    limit: 3,
    windowMs: 3600_000,
  });
  if (blocked) return blocked;

  const user = await getCurrentUser();
  const email = user?.email?.toLowerCase() ?? null;
  if (!email) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const confirm =
    typeof body?.confirmEmail === "string"
      ? body.confirmEmail.trim().toLowerCase()
      : "";
  if (confirm !== email) {
    return NextResponse.json({ error: "confirmation_mismatch" }, { status: 400 });
  }

  const result = await eraseUserData(email);
  return NextResponse.json({ ok: true, ...result });
}
