// Role-based access control + editable profile helpers.
//
// Ships inside the generated template. All external reads are guarded so a
// template without Supabase / the profiles table still type-checks and renders
// instead of throwing.
//
// TWO STORES, ONE API — the same switching contract the license / order /
// stats layers use:
//   * SUPABASE_SERVICE_ROLE_KEY present → Supabase Auth + the `profiles` table
//     is the source of truth for accounts and roles.
//   * key absent → the local SQLite mirror (lib/local-profiles.ts) is the
//     source of truth. Roles are listed, edited and persisted locally.
//
// The SQLite layer is Node-only, so it is reached through a DYNAMIC import:
// this module itself stays free of server-only imports and can still be
// imported from code that runs on the Edge.

import { env } from "@/lib/env";
import { getCurrentUser } from "@/lib/subscriptions";

export const ROLES = ["admin", "staff", "member"] as const;
export type Role = (typeof ROLES)[number];

export type Profile = {
  id: string;
  email: string | null;
  displayName: string | null;
  fullName: string | null;
  company: string | null;
  role: Role;
  createdAt: string | null;
  updatedAt: string | null;
};

/** An admin or staff member may open /admin. Members may not. */
export function canAccessAdmin(role?: string | null): boolean {
  return role === "admin" || role === "staff";
}

/** Only a full admin may change other users' roles. */
export function canManageRoles(role?: string | null): boolean {
  return role === "admin";
}

/** Console copy key for a role, e.g. "role.admin". */
export function roleKey(role?: string | null): `role.${Role}` {
  return role === "admin" || role === "staff" || role === "member"
    ? `role.${role}`
    : "role.member";
}

function hasSupabase(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function hasServiceRole(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * The local (SQLite) account store, or null when it cannot be loaded —
 * Node < 22.5 without `node:sqlite`, or a read-only filesystem.
 *
 * Reached through a dynamic import on purpose: lib/local-profiles.ts pulls in
 * node:sqlite, and this module must stay importable from the Edge runtime.
 */
async function localStore(): Promise<
  typeof import("@/lib/local-profiles") | null
> {
  try {
    return await import("@/lib/local-profiles");
  } catch {
    return null;
  }
}

/** Comma-separated seed allowlist of admin emails (see ADMIN_EMAILS). */
export function adminSeedEmails(): string[] {
  return (env.adminEmails() ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Effective admin capability for a signed-in user, resolving in this order:
 *   1. the persisted `role` on their profile (source of truth once seeded),
 *   2. falling back to the ADMIN_EMAILS seed (so the first admin can log in
 *      before the role column has been promoted).
 * Returns null when there is no identity at all.
 *
 * With a service-role key the profile lives in Supabase; without one it lives
 * in the local SQLite mirror — the answer is the same either way.
 */
export async function resolveAdminRole(
  email?: string | null,
  userId?: string | null,
): Promise<Role | null> {
  if (!email && !userId) return null;

  if (hasServiceRole()) {
    try {
      const { createSupabaseServerClient } = await import(
        "@/lib/supabase/server"
      );
      const db = await createSupabaseServerClient();
      const query = userId
        ? db.from("profiles").select("role").eq("id", userId).maybeSingle()
        : db.from("profiles").select("role").eq("email", email ?? "").maybeSingle();
      const { data } = await query;
      if (data?.role && ROLES.includes(data.role as Role)) {
        return data.role as Role;
      }
    } catch {
      /* table missing / no identity */
    }
    if (email && adminSeedEmails().includes(email.toLowerCase())) return "admin";
    return "member";
  }

  // Local mode: the SQLite mirror is the authority.
  if (!email) return null;
  const store = await localStore();
  const seeded = adminSeedEmails().includes(email.toLowerCase());
  const profile = store?.getLocalProfile(email) ?? null;
  if (profile) {
    // The seed allowlist is the documented "these e-mails are admins"
    // contract, so it outranks a plain member row.
    if (profile.role === "member" && seeded) {
      store?.setLocalRole(email, "admin");
      return "admin";
    }
    return profile.role;
  }
  // First sight of this account in local mode → create the row.
  store?.ensureLocalProfile(email, { authId: userId ?? null });
  if (seeded) {
    store?.setLocalRole(email, "admin");
    return "admin";
  }
  return "member";
}

/** The signed-in user's own profile (display name, company, role, …). */
export async function getCurrentProfile(): Promise<Profile | null> {
  let user: { id: string; email?: string | null } | null = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }
  if (!user) return null;
  const email = user.email ?? null;

  if (!hasServiceRole()) {
    // Local mode: read (and lazily create) the account in SQLite.
    const store = await localStore();
    const local = email
      ? store?.ensureLocalProfile(email, { authId: user.id }) ?? null
      : null;
    if (local) {
      return {
        id: local.authId ?? user.id,
        email: local.email,
        displayName: local.displayName,
        fullName: local.fullName,
        company: local.company,
        role: local.role,
        createdAt: local.createdAt,
        updatedAt: local.updatedAt,
      };
    }
    // No local store available — fall through to Supabase for the fields.
  }

  if (!hasSupabase()) return null;
  try {
    const { createSupabaseServerClient } = await import(
      "@/lib/supabase/server"
    );
    const db = await createSupabaseServerClient();
    const { data } = await db
      .from("profiles")
      .select("id, email, display_name, full_name, company, role, created_at, updated_at")
      .eq("id", user.id)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      email: data.email ?? user.email ?? null,
      displayName: data.display_name ?? null,
      fullName: data.full_name ?? null,
      company: data.company ?? null,
      role: (ROLES.includes(data.role as Role) ? data.role : "member") as Role,
      createdAt: data.created_at ?? null,
      updatedAt: data.updated_at ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Promote seeded admin emails to role='admin'. Idempotent. Call from admin
 * pages so the ADMIN_EMAILS allowlist becomes a real, persisted role instead
 * of a runtime-only fallback.
 *
 * Writes to Supabase when a service-role key is configured, otherwise to the
 * local SQLite mirror — so the local install gets the same behaviour.
 */
export async function ensureSeedAdmins(): Promise<void> {
  const seeds = adminSeedEmails();
  if (!seeds.length) return;
  if (hasServiceRole()) {
    try {
      const { createSupabaseAdminClient } = await import(
        "@/lib/supabase/admin"
      );
      const db = createSupabaseAdminClient();
      await db
        .from("profiles")
        .update({ role: "admin" })
        .in("email", seeds);
    } catch {
      /* missing table / network — the seed fallback still works at runtime */
    }
    return;
  }
  const store = await localStore();
  if (!store) return;
  for (const email of seeds) store.setLocalRole(email, "admin");
}

/**
 * Read every profile's role, keyed by lower-cased email. Used by the admin
 * user directory to render roles. Falls back to "member" when unknown.
 */
export async function getRolesByEmail(): Promise<Record<string, Role>> {
  if (hasServiceRole()) {
    try {
      const { createSupabaseAdminClient } = await import(
        "@/lib/supabase/admin"
      );
      const db = createSupabaseAdminClient();
      const { data } = await db
        .from("profiles")
        .select("email, role")
        .limit(1000);
      const out: Record<string, Role> = {};
      for (const r of data ?? []) {
        if (!r.email) continue;
        out[r.email.toLowerCase()] =
          (ROLES.includes(r.role as Role) ? r.role : "member") as Role;
      }
      return out;
    } catch {
      return {};
    }
  }

  const store = await localStore();
  if (!store) return {};
  const out: Record<string, Role> = {};
  for (const p of store.listLocalProfiles()) out[p.email] = p.role;
  return out;
}

/**
 * Update a single user's role from the admin console.
 *
 * Writes to the Supabase `profiles` table when a service-role key is
 * configured, otherwise to the local SQLite mirror — so the local install can
 * really assign roles, and switching to Supabase later needs no code change.
 */
export async function setUserRole(
  target: { userId?: string; email?: string },
  role: Role,
): Promise<void> {
  if (!ROLES.includes(role)) throw new Error("Invalid role");

  if (hasServiceRole()) {
    const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const db = createSupabaseAdminClient();
    let q = db.from("profiles").update({ role });
    if (target.userId) q = q.eq("id", target.userId);
    else if (target.email) q = q.eq("email", target.email);
    else throw new Error("Need userId or email");
    const { error } = await q;
    if (error) throw new Error(error.message);
    return;
  }

  const store = await localStore();
  if (!store) {
    throw new Error(
      "The local database is unavailable (Node 22.5+ and a writable .data/ " +
        "directory are required). Configure SUPABASE_SERVICE_ROLE_KEY to " +
        "manage roles in Supabase instead.",
    );
  }
  const email = target.email?.trim();
  if (!email) {
    throw new Error(
      "Local mode identifies accounts by email — no email was supplied.",
    );
  }
  store.setLocalRole(email, role);
}
