// Authoritative access check for the operator console.
//
// The Edge middleware can only see that the session cookie EXISTS — it cannot
// reach SQLite to validate the session id (node:sqlite is Node-only). This
// module is the Node-side counterpart: every server component and route
// handler that touches operator data must go through it.
//
// Two independent ways into /admin:
//   1. the operator account (ADMIN_USER / ADMIN_PASSWORD), stored as a scrypt
//      hash in the local database and exchanged for an opaque session cookie;
//   2. a signed-in Supabase user holding an admin/staff role (or listed in
//      ADMIN_EMAILS).
//
// Node-only: uses next/headers + node:sqlite.

import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-cookie";
import { sessionUser } from "@/lib/admin-auth";

/** The signed-in operator (local credential store), or null. */
export async function currentOperator(): Promise<string | null> {
  try {
    const jar = await cookies();
    const sid = jar.get(ADMIN_SESSION_COOKIE)?.value;
    if (!sid) return null;
    return sessionUser(sid);
  } catch {
    // No session cookie, an expired session, or a database that cannot be
    // opened (Node < 22.5 without Supabase). Treat as "not signed in".
    return null;
  }
}

/**
 * True when a signed-in Supabase user holds an admin/staff role, or appears in
 * the ADMIN_EMAILS allowlist. This is the second, independent way into the
 * console — no operator account required.
 */
export async function supabaseAdminAccess(): Promise<boolean> {
  try {
    const { getCurrentUser } = await import("@/lib/subscriptions");
    const { resolveAdminRole, canAccessAdmin } = await import("@/lib/rbac");
    const user = await getCurrentUser();
    if (!user) return false;
    const role = await resolveAdminRole(user.email, user.id);
    return canAccessAdmin(role);
  } catch {
    // Supabase is not configured, the profiles table is missing, or the
    // network failed — none of those grant access.
    return false;
  }
}

/** True when the current visitor may read the operator console. */
export async function isOperatorAuthorized(): Promise<boolean> {
  if (await currentOperator()) return true;
  return supabaseAdminAccess();
}

/**
 * The display name of the current operator. Supabase admins are shown by
 * their email; local operators by their username.
 */
export async function operatorIdentity(): Promise<string | null> {
  const operator = await currentOperator();
  if (operator) return operator;
  try {
    const { getCurrentUser } = await import("@/lib/subscriptions");
    const user = await getCurrentUser();
    return user?.email ?? null;
  } catch {
    return null;
  }
}
