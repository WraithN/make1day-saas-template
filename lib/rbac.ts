// Role-based access control + editable profile helpers.
//
// Ships inside the generated template (no server-only imports). All external
// reads are guarded so a template without Supabase / the profiles table still
// type-checks and renders instead of throwing.

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
 * Returns null when there is no Supabase identity at all.
 */
export async function resolveAdminRole(
  email?: string | null,
  userId?: string | null,
): Promise<Role | null> {
  if (!hasSupabase() || (!email && !userId)) return null;
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

/** The signed-in user's own profile (display name, company, role, …). */
export async function getCurrentProfile(): Promise<Profile | null> {
  if (!hasSupabase()) return null;
  const user = await getCurrentUser();
  if (!user) return null;
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
 * of a runtime-only fallback. No-op without a service-role key.
 */
export async function ensureSeedAdmins(): Promise<void> {
  const seeds = adminSeedEmails();
  if (!seeds.length || !hasServiceRole()) return;
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
}

/**
 * Read every profile's role, keyed by lower-cased email. Used by the admin
 * user directory to render roles. Falls back to "member" when unknown.
 */
export async function getRolesByEmail(): Promise<Record<string, Role>> {
  if (!hasServiceRole()) return {};
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

/** Update a single user's role from the admin console (service role). */
export async function setUserRole(
  target: { userId?: string; email?: string },
  role: Role,
): Promise<void> {
  if (!ROLES.includes(role)) throw new Error("Invalid role");
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const db = createSupabaseAdminClient();
  let q = db.from("profiles").update({ role });
  if (target.userId) q = q.eq("id", target.userId);
  else if (target.email) q = q.eq("email", target.email);
  else throw new Error("Need userId or email");
  const { error } = await q;
  if (error) throw new Error(error.message);
}
