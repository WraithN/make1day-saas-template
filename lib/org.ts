// Multi-tenancy helpers: organizations / workspaces + the active-org cookie.
//
// Ships inside the generated template (server-only; imports the Supabase
// server client). Every data query that should be tenant-scoped should call
// `requireTenant()` (or `getActiveOrgId`) and add `.eq("org_id", orgId)` so a
// workspace never reads another workspace's rows. All reads are guarded so a
// template without Supabase / the orgs table still type-checks and renders.

import { cookies } from "next/headers";

export const ACTIVE_ORG_COOKIE = "sk_org";

export type Org = {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member";
};

/** Read the active org id from the cookie (may be empty = personal space). */
export async function getActiveOrgId(): Promise<string | null> {
  try {
    const c = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
    return c && c.length ? c : null;
  } catch {
    return null;
  }
}

function hasSupabase(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** List the orgs a user belongs to (with their role in each). */
export async function getUserOrgs(userId: string): Promise<Org[]> {
  if (!hasSupabase()) return [];
  try {
    const { createSupabaseServerClient } = await import(
      "@/lib/supabase/server"
    );
    const db = await createSupabaseServerClient();
    const { data, error } = await db
      .from("memberships")
      .select("role, organizations(id, name, slug)")
      .eq("user_id", userId);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.organizations.id,
      name: r.organizations.name,
      slug: r.organizations.slug,
      role: r.role,
    }));
  } catch {
    return [];
  }
}

/** Create an org and make the caller its owner. Returns the new org id. */
export async function createOrg(
  name: string,
  ownerId: string,
): Promise<string> {
  if (!hasSupabase()) throw new Error("Supabase is not configured");
  const { createSupabaseServerClient } = await import(
    "@/lib/supabase/server"
  );
  const db = await createSupabaseServerClient();
  const slug =
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "workspace";
  const { data: org, error } = await db
    .from("organizations")
    .insert({ name, slug, owner_id: ownerId })
    .select("id")
    .maybeSingle();
  if (error) throw error;
  const orgId = (org as { id: string }).id;
  await db
    .from("memberships")
    .insert({ org_id: orgId, user_id: ownerId, role: "owner" });
  return orgId;
}

/**
 * Resolve the active tenant for the current request. Returns the active org id
 * (from cookie, validated against the user's memberships) or null for the
 * user's personal space. Throws only when Supabase is misconfigured.
 */
export async function requireTenant(
  userId: string,
  activeOrgId?: string | null,
): Promise<string | null> {
  const wanted = activeOrgId ?? (await getActiveOrgId());
  if (!wanted) return null;
  const orgs = await getUserOrgs(userId);
  return orgs.some((o) => o.id === wanted) ? wanted : null;
}
