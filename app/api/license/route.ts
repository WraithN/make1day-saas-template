import { guardApiWrite } from "@/lib/http-guard";
import { NextResponse } from "next/server";
import {
  LICENSE_COOKIE,
  licenseKeyFromRequest,
  verifyLicenseKey,
} from "@/lib/license";
import { isLicenseGateEnabled } from "@/lib/env";
import { recordDeliveryEvent } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Redeem a license key: verify it, then store it in an httpOnly cookie. */
export async function POST(req: Request) {
  const blocked = await guardApiWrite(req, {
    bucket: "license-redeem",
    limit: 30,
    windowMs: 3600000,
  });
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({}));
  const key = typeof body?.licenseKey === "string" ? body.licenseKey.trim() : "";
  if (!key) {
    return NextResponse.json({ error: "missing_license_key" }, { status: 400 });
  }
  const payload = verifyLicenseKey(key);
  if (!payload) {
    return NextResponse.json({ error: "invalid_license" }, { status: 400 });
  }

  // A redeemed key is the moment the buyer takes possession of the product.
  // Logged with a hashed email so refund / support disputes have evidence
  // without creating a new plaintext PII store.
  recordDeliveryEvent("activate", {
    jti: payload.jti,
    email: payload.email,
  });

  const res = NextResponse.json({
    ok: true,
    plan: payload.plan,
    pkg: payload.pkg ?? null,
    email: payload.email ?? null,
    expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
    updatesUntil: payload.updatesUntil
      ? new Date(payload.updatesUntil * 1000).toISOString()
      : null,
  });
  res.cookies.set(LICENSE_COOKIE, key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

/** Read-only status for the UI (never consumes the anonymous free quota). */
export async function GET(req: Request) {
  const key = licenseKeyFromRequest(req);
  const payload = key ? verifyLicenseKey(key) : null;
  return NextResponse.json({
    gateEnabled: isLicenseGateEnabled(),
    redeemed: !!payload,
    plan: payload?.plan ?? null,
    pkg: payload?.pkg ?? null,
    email: payload?.email ?? null,
    expiresAt: payload?.exp
      ? new Date(payload.exp * 1000).toISOString()
      : null,
    updatesUntil: payload?.updatesUntil
      ? new Date(payload.updatesUntil * 1000).toISOString()
      : null,
  });
}

/** Remove the stored key (sign out of the license). */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(LICENSE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
