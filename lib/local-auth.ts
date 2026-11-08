// Local password sign-in — the missing consumer for password resets and
// email verification.
//
// Without SUPABASE_SERVICE_ROLE_KEY / Supabase Auth, profiles live in SQLite.
// Previously a user could reset a password but had no way to actually sign in
// with it. This module verifies the scrypt hash, issues an opaque session
// token (only its SHA-256 hash is stored) and resolves that session back into
// a user object for getCurrentUser().
//
// Node-only. This is NOT a full auth provider: no MFA, no OAuth, no session
// rotation. Configure Supabase Auth for those.

import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { get, run } from "@/lib/sqlite";

export const LOCAL_SESSION_COOKIE = "sk_local_session";
export const LOCAL_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type ProfileRow = {
  email: string;
  password_hash: string | null;
  salt: string | null;
};
type SessionRow = {
  token_hash: string;
  email: string;
  expires_at: string;
};

function hash(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function derived(password: string, salt: string): Buffer {
  return Buffer.from(scryptSync(password, salt, 64).toString("hex"), "hex");
}

/** Returns a session token, or null for any invalid credential (no enumeration). */
export async function signInLocal(
  emailInput: string,
  password: string,
): Promise<string | null> {
  const email = emailInput.trim().toLowerCase();
  if (!email || !password || password.length > 512) return null;
  const row = get<ProfileRow>(
    "SELECT email, password_hash, salt FROM profiles WHERE email = ?",
    email,
  );
  if (!row?.password_hash || !row.salt) return null;
  const expected = Buffer.from(row.password_hash, "hex");
  const actual = derived(password, row.salt);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }
  const raw = randomBytes(32).toString("base64url");
  const now = new Date().toISOString();
  // One active session per account keeps the table small and makes a reset
  // effectively revoke older sessions.
  run("DELETE FROM local_sessions WHERE email = ?", row.email);
  run(
    `INSERT INTO local_sessions (token_hash, email, expires_at, created_at)
     VALUES (?, ?, ?, ?)`,
    hash(raw),
    row.email,
    new Date(Date.now() + LOCAL_SESSION_TTL_MS).toISOString(),
    now,
  );
  return raw;
}

/** Resolve the current local session from the request cookies. */
export async function currentLocalUser(): Promise<{
  id: string;
  email: string;
} | null> {
  try {
    const jar = await cookies();
    const raw = jar.get(LOCAL_SESSION_COOKIE)?.value;
    if (!raw || raw.length > 512) return null;
    const row = get<SessionRow>(
      "SELECT token_hash, email, expires_at FROM local_sessions WHERE token_hash = ?",
      hash(raw),
    );
    if (!row) return null;
    if (Date.parse(row.expires_at) <= Date.now()) {
      run("DELETE FROM local_sessions WHERE token_hash = ?", hash(raw));
      return null;
    }
    return { id: `local:${row.email}`, email: row.email };
  } catch {
    return null;
  }
}

export async function signOutLocal(): Promise<void> {
  try {
    const jar = await cookies();
    const raw = jar.get(LOCAL_SESSION_COOKIE)?.value;
    if (raw) run("DELETE FROM local_sessions WHERE token_hash = ?", hash(raw));
  } catch {
    /* already signed out */
  }
}

/**
 * Dev-only shortcut: log in with an empty username/password. Lets a developer
 * reach /account without inventing credentials during local work. Hard-disabled
 * in production so it can never become a real backdoor. The session is a normal
 * local session (resolved by currentLocalUser), not the demo cookie.
 */
export async function devAutoLogin(): Promise<string | null> {
  if (process.env.NODE_ENV === "production") return null;
  const email = "dev@example.com";
  const raw = randomBytes(32).toString("base64url");
  const now = new Date().toISOString();
  run("DELETE FROM local_sessions WHERE email = ?", email);
  run(
    `INSERT INTO local_sessions (token_hash, email, expires_at, created_at)
     VALUES (?, ?, ?, ?)`,
    hash(raw),
    email,
    new Date(Date.now() + LOCAL_SESSION_TTL_MS).toISOString(),
    now,
  );
  return raw;
}

/** Drop expired rows (called opportunistically by the retention job). */
export function pruneLocalSessions(): number {
  return run(
    "DELETE FROM local_sessions WHERE expires_at <= ?",
    new Date().toISOString(),
  );
}
