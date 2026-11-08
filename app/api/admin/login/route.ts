import { guardApiWrite } from "@/lib/http-guard";
import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  authenticate,
  createSession,
  hasAdminUser,
  pruneSessions,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// ── Brute-force throttle ────────────────────────────────────────────────
// In-memory and per-IP: enough to make online guessing impractical on a
// single instance. A multi-instance deployment needs a shared store — the
// sessions themselves already live in SQLite, which is shared.
// Throttling now uses the persistent, cross-instance guard in
// lib/http-guard.ts (SQLite or the consume_rate_limit() Supabase RPC).

/**
 * POST /api/admin/login { username, password }
 *
 * Exchanges the operator credentials for an opaque session cookie. The
 * password is verified against a scrypt hash in the local database; the
 * plaintext is never stored and never leaves this process.
 */
export async function POST(request: Request) {
  const blocked = await guardApiWrite(request, {
    bucket: "admin-login",
    limit: 8,
    windowMs: 60000,
  });
  if (blocked) return blocked;


  let body: { username?: unknown; password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!username || !password) {
    return NextResponse.json({ error: "missing_credentials" }, { status: 400 });
  }

  if (!hasAdminUser()) {
    return NextResponse.json(
      { error: "admin_not_configured" },
      { status: 503 },
    );
  }

  if (!authenticate(username, password)) {
      return NextResponse.json(
      { error: "invalid_credentials" },
      { status: 401 },
    );
  }

  pruneSessions();
  const signed = await createSession(username);
  if (!signed) {
    return NextResponse.json(
      {
        error: "admin_not_configured",
        message: "Set ADMIN_SESSION_SECRET (or ADMIN_PASSWORD) to enable operator sessions.",
      },
      { status: 503 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, signed, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
