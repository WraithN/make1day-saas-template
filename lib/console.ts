// Server-side data + authorization helpers shared by the two consoles.
//
// Deliberately depends ONLY on modules that exist in every generated build
// (lib/license.ts, lib/stats.ts, lib/subscriptions.ts, lib/env.ts). It must
// never import a payment adapter or a ShipKit-site-only endpoint, otherwise
// pruning a gateway out of a downloaded template would break `tsc`.

import { env, isLicenseGateEnabled } from "@/lib/env";
import {
  findLicenseByEmail,
  listLicenses,
  type LicenseRecord,
} from "@/lib/license";
import { getStats } from "@/lib/stats";
import {
  getCurrentSubscription,
  getCurrentUser,
  isSubscribed,
  type SubscriptionRow,
} from "@/lib/subscriptions";
import { isDemoMode } from "@/lib/demo";
import {
  getCurrentProfile,
  ensureSeedAdmins,
  getRolesByEmail,
  resolveAdminRole,
  canManageRoles,
  type Role,
  type Profile,
} from "@/lib/rbac";

/** Comma-separated allowlist for role checks on /admin. */
export function adminEmails(): string[] {
  return (env.adminEmails() ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

/** HTTP Basic Auth is the outermost /admin guard. */
export function isAdminProtected(): boolean {
  return !!(env.adminUser() && env.adminPassword());
}

function hasSupabase(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function usesServiceRole(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// ── User console ───────────────────────────────────────────────────────────

export type AccountSnapshot = {
  email: string | null;
  userId: string | null;
  subscription: SubscriptionRow | null;
  active: boolean;
  license: LicenseRecord | null;
  gateEnabled: boolean;
  demoMode: boolean;
  profile: Profile | null;
  role: Role | null;
};

/**
 * Best-effort read of the signed-in user's state. Every external read is
 * guarded: a template that has not configured Supabase / LICENSE_SECRET yet
 * still renders the console instead of throwing.
 */
export async function getAccountSnapshot(): Promise<AccountSnapshot> {
  let email: string | null = null;
  let userId: string | null = null;
  let subscription: SubscriptionRow | null = null;
  let license: LicenseRecord | null = null;
  let profile: Profile | null = null;

  try {
    if (hasSupabase()) {
      const user = await getCurrentUser();
      email = user?.email ?? null;
      userId = user?.id ?? null;
      if (user) subscription = await getCurrentSubscription();
      if (email) license = await findLicenseByEmail(email);
      profile = await getCurrentProfile();
    }
  } catch {
    // Missing env / network / unapplied migration: show an empty state.
  }

  return {
    email,
    userId,
    subscription,
    active: isSubscribed(subscription),
    license,
    gateEnabled: isLicenseGateEnabled(),
    demoMode: isDemoMode(),
    profile,
    role: profile?.role ?? null,
  };
}

/** All keys issued to this email (buyouts + renewed Care keys). */
export async function getMyLicenses(
  email: string | null,
): Promise<LicenseRecord[]> {
  if (!email) return [];
  try {
    const all = await listLicenses();
    const mine = all.filter(
      (l) => l.email?.toLowerCase() === email.toLowerCase(),
    );
    // findLicenseByEmail may resolve from Supabase even when the local list is
    // empty; include that key too without duplicating it.
    const claimed = await findLicenseByEmail(email);
    if (claimed && !mine.some((l) => l.jti === claimed.jti)) {
      mine.unshift(claimed);
    }
    return mine;
  } catch {
    return [];
  }
}

// ── Admin console ──────────────────────────────────────────────────────────

export type ConsoleUser = {
  email: string;
  createdAt?: string | null;
  plan?: string | null;
  origin: "supabase" | "license" | "subscription";
  role?: Role | null;
};

export type AdminSnapshot = {
  licenses: LicenseRecord[];
  users: ConsoleUser[];
  userSource: "supabase" | "derived";
  stats: Awaited<ReturnType<typeof getStats>>;
  protected: boolean;
  roleAllowlist: string[];
  gateEnabled: boolean;
  serviceRole: boolean;
  adminEmail: string | null;
  currentRole: Role | null;
  canManage: boolean;
};

async function readSubscriptions(): Promise<ConsoleUser[]> {
  if (!usesServiceRole()) return [];
  try {
    const { createSupabaseAdminClient } = await import(
      "@/lib/supabase/admin"
    );
    const db = createSupabaseAdminClient();
    const { data } = await db
      .from("subscriptions")
      .select("user_id, plan, status, created_at")
      .limit(200);
    return (data ?? []).map((r: any) => ({
      // The subscriptions table stores user_id, not email — the user id is
      // shown as a stable identifier when no auth directory is available.
      email: r.user_id ?? "unknown",
      createdAt: r.created_at ?? null,
      plan: r.plan ?? r.status ?? null,
      origin: "subscription" as const,
    }));
  } catch {
    return [];
  }
}

async function readUserDirectory(rolesByEmail: Record<string, Role>): Promise<{
  users: ConsoleUser[];
  source: "supabase" | "derived";
}> {
  if (usesServiceRole()) {
    try {
      const { createSupabaseAdminClient } = await import(
        "@/lib/supabase/admin"
      );
      const db = createSupabaseAdminClient();
      const { data, error } = await db.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (!error && data?.users) {
        const users: ConsoleUser[] = data.users.map((u: any) => ({
          email: u.email ?? u.id,
          createdAt: u.created_at ?? null,
          plan: null,
          origin: "supabase" as const,
          role: u.email ? rolesByEmail[u.email.toLowerCase()] ?? null : null,
        }));
        return { users, source: "supabase" };
      }
    } catch {
      // fall through to derived list
    }
  }

  const licenses = await listLicenses().catch(() => [] as LicenseRecord[]);
  const subs = await readSubscriptions();
  const seen = new Set<string>();
  const users: ConsoleUser[] = [];
  for (const l of licenses) {
    if (!l.email || seen.has(l.email.toLowerCase())) continue;
    seen.add(l.email.toLowerCase());
    users.push({
      email: l.email,
      createdAt: l.createdAt,
      plan: l.plan,
      origin: "license",
      role: rolesByEmail[l.email.toLowerCase()] ?? null,
    });
  }
  for (const s of subs) {
    if (seen.has(s.email.toLowerCase())) continue;
    seen.add(s.email.toLowerCase());
    users.push({ ...s, role: rolesByEmail[s.email.toLowerCase()] ?? null });
  }
  return { users, source: "derived" };
}

export async function getAdminSnapshot(): Promise<AdminSnapshot> {
  // Promote seeded admin emails so the ADMIN_EMAILS allowlist becomes a real,
  // persisted role (idempotent; no-op without a service-role key).
  await ensureSeedAdmins().catch(() => {});

  const licenses = await listLicenses().catch(() => [] as LicenseRecord[]);
  const stats = await getStats().catch(() => ({
    total: 0,
    pages: {},
    updatedAt: new Date(0).toISOString(),
  }));

  const rolesByEmail = await getRolesByEmail().catch(
    () => ({}) as Record<string, Role>,
  );
  const { users, source } = await readUserDirectory(rolesByEmail);

  let adminEmail: string | null = null;
  let currentRole: Role | null = null;
  try {
    if (hasSupabase()) {
      const user = await getCurrentUser();
      adminEmail = user?.email ?? null;
      currentRole = await resolveAdminRole(user?.email, user?.id);
    }
  } catch {
    /* ignore */
  }

  return {
    licenses,
    users,
    userSource: source,
    stats,
    protected: isAdminProtected(),
    roleAllowlist: adminEmails(),
    gateEnabled: isLicenseGateEnabled(),
    serviceRole: usesServiceRole(),
    adminEmail,
    currentRole,
    canManage: canManageRoles(currentRole),
  };
}
