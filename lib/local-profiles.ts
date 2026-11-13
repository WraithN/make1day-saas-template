// Local account + role store — the SQLite mirror of the Supabase `profiles`
// table.
//
// Why this file exists: the admin console needs a REAL user directory and a
// REAL role store even when Supabase is not configured yet. Deriving roles
// from licenses left the role column read-only, which made the local install
// look broken. This module gives the local install the same capability the
// hosted one has, backed by `.data/app.db`.
//
// The switching contract (the same one the license / order / stats layers
// already use):
//   * SUPABASE_SERVICE_ROLE_KEY present  → Supabase Auth + `profiles` is the
//     source of truth. Nothing in this file is consulted.
//   * key absent                        → this SQLite table is the source of
//     truth. Accounts and roles are listed, edited and persisted here.
//
// The column names mirror supabase/migrations/0004_profiles_rbac.sql on
// purpose, so `scripts/export-local-profiles.mjs` can move the rows across
// without renaming anything.
//
// Node-only: it reaches node:sqlite through lib/sqlite.ts.

import { all, get, run } from "@/lib/sqlite";
import { ROLES, type Role } from "@/lib/rbac";

export type LocalProfile = {
  /** Lower-cased email — the primary key of the local table. */
  email: string;
  /** Supabase auth user id, when the account also exists in Supabase. */
  authId: string | null;
  role: Role;
  displayName: string | null;
  fullName: string | null;
  company: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type ProfileRow = {
  email: string;
  id: string | null;
  role: string | null;
  display_name: string | null;
  full_name: string | null;
  company: string | null;
  created_at: string | null;
  updated_at: string | null;
};

/** The role vocabulary has a single source of truth: lib/rbac.ts. */
export function toRole(value: unknown): Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value)
    ? (value as Role)
    : "member";
}

function rowToProfile(row: ProfileRow): LocalProfile {
  return {
    email: row.email,
    authId: row.id ?? null,
    role: toRole(row.role),
    displayName: row.display_name ?? null,
    fullName: row.full_name ?? null,
    company: row.company ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

/** Every locally known account, newest first. */
export function listLocalProfiles(limit = 500): LocalProfile[] {
  return all<ProfileRow>(
    "SELECT * FROM profiles ORDER BY created_at DESC LIMIT ?",
    limit,
  ).map(rowToProfile);
}

/** One account by email, or null. */
export function getLocalProfile(email: string): LocalProfile | null {
  const key = normalize(email);
  if (!key) return null;
  const row = get<ProfileRow>("SELECT * FROM profiles WHERE email = ?", key);
  return row ? rowToProfile(row) : null;
}

/**
 * Create the account row if it is missing. Never touches an existing role —
 * this is the "the user exists now" hook, not an escalation path.
 */
export function ensureLocalProfile(
  email: string,
  init?: { authId?: string | null; displayName?: string | null },
): LocalProfile | null {
  const key = normalize(email);
  if (!key) return null;
  const now = new Date().toISOString();
  run(
    `INSERT OR IGNORE INTO profiles
      (email, id, role, display_name, full_name, company, created_at, updated_at)
     VALUES (?, ?, 'member', ?, NULL, NULL, ?, ?)`,
    key,
    init?.authId ?? null,
    init?.displayName ?? null,
    now,
    now,
  );
  // Fill in the auth id once we learn it, but keep the role untouched.
  if (init?.authId) {
    run(
      "UPDATE profiles SET id = ? WHERE email = ? AND (id IS NULL OR id = '')",
      init.authId,
      key,
    );
  }
  return getLocalProfile(key);
}

/**
 * Persist a role for an account. Creates the account when it does not exist
 * yet — promoting a buyer to staff is exactly how the local directory grows.
 */
export function setLocalRole(email: string, role: Role): LocalProfile {
  const key = normalize(email);
  if (!key) throw new Error("An email is required");
  if (!(ROLES as readonly string[]).includes(role)) throw new Error("Invalid role");
  const now = new Date().toISOString();
  const existing = getLocalProfile(key);
  if (!existing) {
    run(
      `INSERT INTO profiles
        (email, id, role, display_name, full_name, company, created_at, updated_at)
       VALUES (?, NULL, ?, NULL, NULL, NULL, ?, ?)`,
      key,
      role,
      now,
      now,
    );
  } else if (existing.role !== role) {
    run(
      "UPDATE profiles SET role = ?, updated_at = ? WHERE email = ?",
      role,
      now,
      key,
    );
  }
  return getLocalProfile(key)!;
}

/** Editable profile fields (never the role — that is an admin action). */
export function updateLocalProfile(
  email: string,
  patch: {
    displayName?: string | null;
    fullName?: string | null;
    company?: string | null;
  },
): LocalProfile | null {
  const key = normalize(email);
  if (!key) return null;
  const existing = getLocalProfile(key);
  if (!existing) return null;
  const now = new Date().toISOString();
  run(
    `UPDATE profiles
       SET display_name = ?, full_name = ?, company = ?, updated_at = ?
     WHERE email = ?`,
    patch.displayName ?? existing.displayName,
    patch.fullName ?? existing.fullName,
    patch.company ?? existing.company,
    now,
    key,
  );
  return getLocalProfile(key);
}

/** Remove an account from the local directory. */
export function deleteLocalProfile(email: string): number {
  const key = normalize(email);
  if (!key) return 0;
  return run("DELETE FROM profiles WHERE email = ?", key);
}
