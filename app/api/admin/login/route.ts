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
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 8;

const attempts = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: Request): string {
  const headers = request.headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "local"
  );
}

function isThrottled(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) return false;
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  entry.count += 1;
}

/**
 * POST /api/admin/login { username, password }
 *
 * Exchanges the operator credentials for an opaque session cookie. The
 * password is verified against a scrypt hash in the local database; the
 * plaintext is never stored and never leaves this process.
 */
export async function POST(request: Request) {
  const key = clientKey(request);
  if (isThrottled(key)) {
    return NextResponse.json(
      { error: "too_many_attempts" },
      { status: 429 },
    );
  }

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
    recordFailure(key);
    return NextResponse.json(
      { error: "invalid_credentials" },
      { status: 401 },
    );
  }

  attempts.delete(key);
  pruneSessions();
  const sid = createSession(username);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, sid, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
