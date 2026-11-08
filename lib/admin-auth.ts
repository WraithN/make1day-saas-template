// Operator authentication for the /admin console.
//
// Why this exists instead of HTTP Basic Auth: a Basic-Auth challenge renders
// a native browser dialog that embedded previews, some kiosk browsers and
// every non-Chrome client refuse to show — the visitor just sees a bare
// "Authentication required" body with no way to type a password. marketit
// therefore uses a normal in-page login form that exchanges credentials for
// an opaque session cookie.
//
// Where the data lives:
//   * credentials — SQLite `admin_users` (username + scrypt hash + salt).
//     Seeded on first use from ADMIN_USER / ADMIN_PASSWORD so an existing
//     deployment keeps working without editing the database by hand.
//   * sessions — SQLite `admin_sessions`, so an operator can be signed out
//     server-side and a stolen cookie expires on its own.
//
// The module is Node-only (node:crypto + node:sqlite): it is never imported
// from the Edge middleware, which only checks for the cookie's presence.

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-cookie";
import { isWeakAdminPassword } from "@/lib/admin-guard";
import {
  signAdminSession,
  verifyAdminSession,
  adminSidFromCookie,
} from "@/lib/admin-cookie-sig";
import { all, get, run } from "@/lib/sqlite";

export { ADMIN_SESSION_COOKIE };

/** Sessions last a week; after that the operator signs in again. */
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** How long a browser should keep the cookie. */
export const ADMIN_SESSION_MAX_AGE = Math.floor(SESSION_TTL_MS / 1000);

type AdminUserRow = {
  username: string;
  password_hash: string;
  salt: string;
  created_at: string;
};

type SessionRow = {
  sid: string;
  username: string;
  expires_at: string;
};

// ── Password hashing ───────────────────────────────────────────────────────

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

/** Constant-time comparison of a candidate password against a stored hash. */
function verifyPassword(password: string, stored: string, salt: string): boolean {
  const expected = Buffer.from(stored, "hex");
  const actual = Buffer.from(hashPassword(password, salt), "hex");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

// ── Operator accounts ──────────────────────────────────────────────────────

/**
 * Make sure at least one operator account exists.
 *
 * The first call seeds the account from ADMIN_USER / ADMIN_PASSWORD (the
 * variables the template already documented), hashing the password with
 * scrypt — the plaintext is never stored. Later calls are a no-op, so
 * changing the env vars afterwards does NOT silently rotate the password;
 * use the admin console instead.
 */
export function ensureAdminUser(): void {
  const existing = get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM admin_users",
  );
  if ((existing?.n ?? 0) > 0) return;

  const username = env.adminUser().trim();
  const password = env.adminPassword();
  if (!username || !password) return;
  // A documented placeholder like `change-me` must never seed a live console.
  // Development keeps working so the operator can still try the UI locally.
  if (process.env.NODE_ENV === "production" && isWeakAdminPassword()) {
    throw new Error(
      "Refusing to seed a weak ADMIN_PASSWORD in production — set a 12+ character secret.",
    );
  }

  const salt = randomBytes(16).toString("hex");
  run(
    `INSERT OR IGNORE INTO admin_users (username, password_hash, salt, created_at)
     VALUES (?, ?, ?, ?)`,
    username,
    hashPassword(password, salt),
    salt,
    new Date().toISOString(),
  );
}

/** True when at least one operator account exists. */
export function hasAdminUser(): boolean {
  ensureAdminUser();
  const row = get<{ n: number }>("SELECT COUNT(*) AS n FROM admin_users");
  return (row?.n ?? 0) > 0;
}

/** Check a username / password pair against the stored operator accounts. */
export function authenticate(username: string, password: string): boolean {
  ensureAdminUser();
  const row = get<AdminUserRow>(
    "SELECT username, password_hash, salt, created_at FROM admin_users WHERE username = ?",
    username.trim(),
  );
  if (!row) return false;
  return verifyPassword(password, row.password_hash, row.salt);
}

// ── Sessions ───────────────────────────────────────────────────────────────

export async function createSession(username: string): Promise<string | null> {
  const sid = randomBytes(32).toString("hex");
  const now = Date.now();
  run(
    `INSERT INTO admin_sessions (sid, username, created_at, expires_at)
     VALUES (?, ?, ?, ?)`,
    sid,
    username.trim(),
    new Date(now).toISOString(),
    new Date(now + SESSION_TTL_MS).toISOString(),
  );
  // The browser receives `<sid>.<hmac>`; middleware can verify it at the Edge
  // without reaching SQLite. Without a signing secret there is no session.
  return signAdminSession(sid);
}

/** Verify the signed cookie, then look the session up in the local store. */
export async function sessionUser(
  cookieValue: string | undefined | null,
): Promise<string | null> {
  const sid = await verifyAdminSession(cookieValue);
  if (!sid) return null;
  const row = get<SessionRow>(
    "SELECT sid, username, expires_at FROM admin_sessions WHERE sid = ?",
    sid,
  );
  if (!row) return null;
  if (Date.parse(row.expires_at) <= Date.now()) {
    run("DELETE FROM admin_sessions WHERE sid = ?", sid);
    return null;
  }
  return row.username;
}

export function destroySession(cookieValue: string | undefined | null): void {
  const sid = adminSidFromCookie(cookieValue);
  if (!sid) return;
  run("DELETE FROM admin_sessions WHERE sid = ?", sid);
}

/** Drop expired sessions. Cheap, and called opportunistically on login. */
export function pruneSessions(): void {
  run("DELETE FROM admin_sessions WHERE expires_at <= ?", new Date().toISOString());
}

/** Every signed-in operator (used by the system page). */
export function listSessions(): { username: string; createdAt: string; expiresAt: string }[] {
  return all<{ username: string; created_at: string; expires_at: string }>(
    "SELECT username, created_at, expires_at FROM admin_sessions ORDER BY created_at DESC",
  ).map((r) => ({
    username: r.username,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
  }));
}
