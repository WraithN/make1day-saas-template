// One-time auth tokens for the LOCAL SQLite path (no SUPABASE_SERVICE_ROLE_KEY).
//
// The Supabase path uses Supabase Auth's own resetPasswordForEmail / verifyOtp
// and needs none of this. Here the raw token lives ONLY in the email link; the
// database stores its SHA-256 hash. A token is single-use (the row is deleted
// inside the same transaction that reads it) and hard-expires.
//
// This module is Node-only and marketit-site-only. It is deliberately NOT a
// full auth provider: there is no local password SIGN-IN endpoint, no MFA,
// no OAuth and no session rotation. See AGENTS.md "Known gaps".
//
// scrypt (same scheme as lib/admin-auth.ts) hashes the new password.

import { createHash, randomBytes, scryptSync } from "node:crypto";
import { env } from "@/lib/env";
import { get, run, tx } from "@/lib/sqlite";

type TokenRow = { token_hash: string; email: string; expires_at: string };

export type AuthBackend = "supabase" | "local";

/**
 * Which auth implementation handles reset / verification. Supabase Auth needs
 * only the project URL + ANON key (the login page already uses those for magic
 * links); the SERVICE_ROLE key is NOT required for these user-facing flows.
 * With neither, the local SQLite token store is used.
 */
export function authBackend(): AuthBackend {
  return process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? "supabase"
    : "local";
}

function hash(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function saltedHash(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

function expiresAt(): string {
  return new Date(Date.now() + env.mailTokenTtlHours() * 3600_000).toISOString();
}

/** A URL-safe, high-entropy token. Only the hash is ever persisted. */
export function newRawToken(): string {
  return randomBytes(32).toString("base64url");
}

function localProfileExists(email: string): boolean {
  const row = get<{ email: string }>(
    "SELECT email FROM profiles WHERE email = ?",
    email,
  );
  return !!row;
}

function createToken(
  table: "password_resets" | "email_verifications",
  email: string,
): string | null {
  // Anti-enumeration lives in the API layer (it ALWAYS returns the same
  // success copy), but we still avoid minting tokens for unknown addresses.
  if (!localProfileExists(email)) return null;
  const raw = newRawToken();
  const now = new Date().toISOString();
  // One active token per address: drop any earlier ones first.
  run(`DELETE FROM ${table} WHERE email = ?`, email);
  run(
    `INSERT INTO ${table} (token_hash, email, expires_at, created_at)
     VALUES (?, ?, ?, ?)`,
    hash(raw),
    email,
    expiresAt(),
    now,
  );
  return raw;
}

/** Consume a token ONCE. Returns the email it was issued for, or null. */
function consumeToken(
  table: "password_resets" | "email_verifications",
  raw: string,
): string | null {
  if (!raw || raw.length > 512) return null;
  const tokenHash = hash(raw);
  return tx(() => {
    const row = get<TokenRow>(
      `SELECT token_hash, email, expires_at FROM ${table} WHERE token_hash = ?`,
      tokenHash,
    );
    if (!row) return null;
    // Delete regardless of expiry: a used or expired token is gone for good.
    run(`DELETE FROM ${table} WHERE token_hash = ?`, tokenHash);
    if (Date.parse(row.expires_at) <= Date.now()) return null;
    return row.email;
  });
}

// ── Password reset ────────────────────────────────────────────────────────

export function createPasswordReset(email: string): string | null {
  return createToken("password_resets", email);
}

export function consumePasswordReset(raw: string): string | null {
  return consumeToken("password_resets", raw);
}

/**
 * Store a new scrypt password hash for a local account. There is no local
 * password sign-in consumer yet (documented as a known gap); this still makes
 * the reset flow a real, verifiable state change rather than a stub.
 */
export function setLocalPassword(email: string, password: string): boolean {
  if (!localProfileExists(email)) return false;
  const salt = randomBytes(16).toString("hex");
  run(
    "UPDATE profiles SET password_hash = ?, salt = ?, updated_at = ? WHERE email = ?",
    saltedHash(password, salt),
    salt,
    new Date().toISOString(),
    email,
  );
  return true;
}

// ── Email verification ────────────────────────────────────────────────────

export function createEmailVerification(email: string): string | null {
  return createToken("email_verifications", email);
}

export function consumeEmailVerification(raw: string): string | null {
  return consumeToken("email_verifications", raw);
}

/** Mark a local account's address as verified. */
export function markEmailVerified(email: string): boolean {
  const changes = run(
    "UPDATE profiles SET email_verified = 1, updated_at = ? WHERE email = ?",
    new Date().toISOString(),
    email,
  );
  return changes > 0;
}

export function isEmailVerified(email: string): boolean {
  const row = get<{ email_verified: number }>(
    "SELECT email_verified FROM profiles WHERE email = ?",
    email,
  );
  return Number(row?.email_verified) === 1;
}

/** Opportunistic cleanup of expired rows. */
export function pruneExpiredAuthTokens(): void {
  const now = new Date().toISOString();
  run("DELETE FROM password_resets WHERE expires_at <= ?", now);
  run("DELETE FROM email_verifications WHERE expires_at <= ?", now);
}
