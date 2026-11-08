// Server-side data + authorization helpers shared by the two consoles.
//
// Deliberately depends ONLY on modules that exist in every generated build
// (lib/license.ts, lib/stats.ts, lib/subscriptions.ts, lib/env.ts). It must
// never import a payment adapter or a marketit-site-only endpoint, otherwise
// pruning a gateway out of a downloaded template would break `tsc`.
// The operator session layer is reached through a DYNAMIC import, so the
// SQLite-backed store is only loaded on pages that actually read it.

import { env, isLicenseGateEnabled } from "@/lib/env";
import {
  findLicenseByEmail,
  listLicenses,
  type LicenseRecord,
} from "@/lib/license";
import { listOrders, type OrderRecord } from "@/lib/orders";
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

/**
 * True when operator credentials are configured. The /admin console is locked
 * behind the operator sign-in (ADMIN_USER / ADMIN_PASSWORD), so this is what
 * the "protected" badge in the console reflects.
 */
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
  /**
   * Where this row came from. The local install has no auth directory, so
   * every row says what it actually is:
   *   local       — an account in the local SQLite profile store
   *   license     — a buyer with an issued license key
   *   order       — a buyer with a paid order
   *   operator    — the local operator account (ADMIN_USER)
   *   supabase    — a row from the Supabase auth directory
   *   subscription — a row from the Supabase subscriptions table
   */
  origin:
    | "supabase"
    | "local"
    | "license"
    | "order"
    | "operator"
    | "subscription";
  role?: Role | null;
  /** The operator account is a username, not an e-mail address. */
  isOperator?: boolean;
};

export type AccessGrant = {
  email: string;
  plan: string | null;
  type: "license" | "subscription";
  since: string | null;
};

export type AccessSummary = {
  issuedLicenses: number;
  subscriptionRows: number;
  paidEmailUsers: number;
  grants: AccessGrant[];
};

export type AdminSnapshot = {
  licenses: LicenseRecord[];
  orders: OrderRecord[];
  access: AccessSummary;
  users: ConsoleUser[];
  /**
   * Where the user directory came from:
   *   "supabase" — the full Supabase auth list (service-role key configured)
   *   "local"    — the local SQLite account store plus licenses / orders
   *   "derived"  — no local store available; only licenses / subscriptions
   */
  userSource: "supabase" | "local" | "derived";
  /**
   * Where a role change is persisted. "none" means neither store is
   * reachable, so the role column has to stay read-only.
   */
  roleStore: "supabase" | "local" | "none";
  stats: Awaited<ReturnType<typeof getStats>>;
  protected: boolean;
  roleAllowlist: string[];
  gateEnabled: boolean;
  serviceRole: boolean;
  adminEmail: string | null;
  currentRole: Role | null;
  canManage: boolean;
  /**
   * Where the current visitor's authority comes from:
   *   "operator" — the local operator account (ADMIN_USER / ADMIN_PASSWORD),
   *                i.e. the credential the console itself is locked behind;
   *   "supabase" — a signed-in Supabase user with a role on their profile.
   * The console shows different guidance for each, so it must not guess.
   */
  identityKind: "operator" | "supabase" | null;
};

/**
 * The signed-in operator account (local credential store), or null.
 *
 * Loaded through a dynamic import so the SQLite-backed session layer is only
 * pulled in on pages that actually need it — the account console imports this
 * module too and must stay free of the admin store.
 */
async function currentOperatorName(): Promise<string | null> {
  try {
    const { currentOperator } = await import("@/lib/admin-session");
    return await currentOperator();
  } catch {
    return null;
  }
}

/**
 * The local account store, or null when it cannot be loaded (Node < 22.5
 * without `node:sqlite`, or a read-only filesystem). Dynamic import for the
 * same reason as the operator session layer above.
 */
async function localProfileStore(): Promise<
  typeof import("@/lib/local-profiles") | null
> {
  try {
    return await import("@/lib/local-profiles");
  } catch {
    return null;
  }
}

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

async function readUserDirectory(
  rolesByEmail: Record<string, Role>,
  operator: string | null,
): Promise<{
  users: ConsoleUser[];
  source: "supabase" | "local" | "derived";
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
      // fall through to the local list
    }
  }

  // ── Local install ──
  // The local SQLite store is a REAL account store: accounts, roles and the
  // operator credential all live there. Buyers and orders are folded in so a
  // fresh install has something to show even before anyone signs up.
  const store = await localProfileStore();
  if (store) {
    const licenses = await listLicenses().catch(() => [] as LicenseRecord[]);
    const orders = await listOrders().catch(() => [] as OrderRecord[]);

    const byEmail = new Map<string, ConsoleUser>();
    const upsert = (row: ConsoleUser) => {
      const key = row.email.trim().toLowerCase();
      if (!key) return;
      const existing = byEmail.get(key);
      if (!existing) {
        byEmail.set(key, row);
        return;
      }
      // Keep the richest origin (local account beats license / order) and
      // fill in whatever the other row knew.
      byEmail.set(key, {
        ...existing,
        origin: existing.origin === "local" ? "local" : row.origin,
        plan: existing.plan ?? row.plan ?? null,
        createdAt: existing.createdAt ?? row.createdAt ?? null,
        role: existing.role ?? row.role ?? null,
      });
    };

    for (const p of store.listLocalProfiles()) {
      upsert({
        email: p.email,
        createdAt: p.createdAt,
        plan: null,
        origin: "local",
        role: rolesByEmail[p.email.toLowerCase()] ?? p.role,
      });
    }
    for (const l of licenses) {
      if (!l.email) continue;
      upsert({
        email: l.email,
        createdAt: l.createdAt,
        plan: l.plan,
        origin: "license",
        role: rolesByEmail[l.email.toLowerCase()] ?? null,
      });
    }
    for (const o of orders) {
      if (!o.email) continue;
      upsert({
        email: o.email,
        createdAt: o.createdAt,
        plan: o.plan ?? null,
        origin: "order",
        role: rolesByEmail[o.email.toLowerCase()] ?? null,
      });
    }

    const users = [...byEmail.values()].sort((a, b) =>
      (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
    );
    if (operator) {
      // The operator account is identified by a username, so it leads the list.
      users.unshift({
        email: operator,
        createdAt: null,
        plan: null,
        origin: "operator",
        role: "admin",
        isOperator: true,
      });
    }
    return { users, source: "local" };
  }

  // ── Fallback: no local store (old Node / read-only filesystem) ──
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
  const orders = await listOrders().catch(() => [] as OrderRecord[]);
  const access = await readAccess(licenses).catch(() => ({
    issuedLicenses: 0,
    subscriptionRows: 0,
    paidEmailUsers: 0,
    grants: [],
  }));
  const stats = await getStats().catch(() => ({
    total: 0,
    pages: {},
    updatedAt: new Date(0).toISOString(),
  }));

  const rolesByEmail = await getRolesByEmail().catch(
    () => ({}) as Record<string, Role>,
  );

  let adminEmail: string | null = null;
  let currentRole: Role | null = null;
  let identityKind: "operator" | "supabase" | null = null;

  // The operator account is the credential the /admin console is locked
  // behind, so it IS the site owner: full authority, even though it has no
  // Supabase profile. Resolving the role from Supabase alone made every
  // operator look like a read-only staff member.
  const operator = await currentOperatorName();
  if (operator) {
    adminEmail = operator;
    currentRole = "admin";
    identityKind = "operator";
  } else if (hasSupabase()) {
    try {
      const user = await getCurrentUser();
      adminEmail = user?.email ?? null;
      currentRole = await resolveAdminRole(user?.email, user?.id);
      identityKind = "supabase";
    } catch {
      /* ignore */
    }
  }

  const { users, source } = await readUserDirectory(rolesByEmail, operator);

  // Where a role change would be persisted. "none" keeps the role column
  // read-only instead of failing with a 500 on click.
  const roleStore: AdminSnapshot["roleStore"] = usesServiceRole()
    ? "supabase"
    : source === "local"
      ? "local"
      : "none";

  return {
    licenses,
    orders,
    access,
    users,
    userSource: source,
    roleStore,
    stats,
    protected: isAdminProtected(),
    roleAllowlist: adminEmails(),
    gateEnabled: isLicenseGateEnabled(),
    serviceRole: usesServiceRole(),
    adminEmail,
    currentRole,
    canManage: canManageRoles(currentRole),
    identityKind,
  };
}

/**
 * Aggregate "who has paid access" from issued licenses + subscription rows.
 * This is the management view behind 付费查看: it tells the operator how many
 * buyers can view paid content and lists the most recent grants. Providers are
 * flattened — a license from Waffo and a Stripe subscription count equally.
 */
async function readAccess(
  licenses: LicenseRecord[],
): Promise<AccessSummary> {
  const subs = await readSubscriptions().catch(() => [] as ConsoleUser[]);
  const emailSet = new Set(
    licenses.map((l) => l.email?.toLowerCase()).filter(Boolean) as string[],
  );
  const grants: AccessGrant[] = [
    ...licenses.map(
      (l): AccessGrant => ({
        email: l.email ?? "(unknown)",
        plan: l.plan,
        type: "license",
        since: l.createdAt,
      }),
    ),
    ...subs.map(
      (s): AccessGrant => ({
        email: s.email,
        plan: s.plan ?? null,
        type: "subscription",
        since: s.createdAt ?? null,
      }),
    ),
  ].sort((a, b) => (b.since ?? "").localeCompare(a.since ?? ""));

  return {
    issuedLicenses: licenses.length,
    subscriptionRows: subs.length,
    paidEmailUsers: emailSet.size,
    grants: grants.slice(0, 50),
  };
}
