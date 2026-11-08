import { NextResponse } from "next/server";
import { guardApiWrite } from "@/lib/http-guard";
import {
  LOCAL_SESSION_COOKIE,
  LOCAL_SESSION_TTL_MS,
  signInLocal,
  signOutLocal,
  devAutoLogin,
} from "@/lib/local-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Local password sign-in / sign-out for installs without Supabase Auth.
 * Keeps the password-reset flow meaningful: a new password can now be used.
 * The login error is identical for unknown emails and wrong passwords.
 */
export async function POST(req: Request) {
  const blocked = await guardApiWrite(req, {
    bucket: "local-login",
    limit: 8,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({}));
  const action = typeof body?.action === "string" ? body.action : "login";
  const cookie = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  };

  if (action === "logout") {
    await signOutLocal();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(LOCAL_SESSION_COOKIE, "", { ...cookie, maxAge: 0 });
    return res;
  }

  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";
  // Dev convenience: empty credentials sign in directly (production refuses).
  const token =
    !email && !password && process.env.NODE_ENV !== "production"
      ? await devAutoLogin()
      : await signInLocal(email, password);
  if (!token) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(LOCAL_SESSION_COOKIE, token, {
    ...cookie,
    maxAge: Math.floor(LOCAL_SESSION_TTL_MS / 1000),
  });
  return res;
}
