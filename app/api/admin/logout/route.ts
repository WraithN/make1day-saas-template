import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, destroySession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/logout
 *
 * Revokes the operator session server-side (the row is deleted, so a copy of
 * the cookie is worthless) and clears it from the browser.
 */
export async function POST() {
  try {
    const jar = await cookies();
    destroySession(jar.get(ADMIN_SESSION_COOKIE)?.value);
  } catch {
    /* nothing to revoke */
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
