import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/subscriptions";
import { resolveAdminRole, canManageRoles, setUserRole, type Role } from "@/lib/rbac";
import { currentOperator } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

const VALID: Role[] = ["admin", "staff", "member"];

/**
 * PATCH /api/admin/users  { target: {userId?|email?}, role }
 *
 * Change another user's role. Only a full admin may do this; the caller's
 * role is resolved from their profile (or the ADMIN_EMAILS seed). Writes go
 * through the service-role key, bypassing RLS. Returns 403 for staff / members.
 *
 * The operator account (ADMIN_USER / ADMIN_PASSWORD) counts as a full admin
 * too — it is the credential the /admin console itself is locked behind.
 */
export async function PATCH(request: Request) {
  const operator = await currentOperator();
  // The Supabase identity of the caller, when they are not the operator.
  let caller: { id: string; email?: string } | null = null;
  if (!operator) {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const role = await resolveAdminRole(user.email, user.id);
    if (!canManageRoles(role)) {
      return NextResponse.json(
        { error: "Only an admin can change roles" },
        { status: 403 },
      );
    }
    caller = { id: user.id, email: user.email ?? undefined };
  }

  let body: { target?: { userId?: string; email?: string }; role?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const target = body.target;
  const newRole = body.role;
  if (!target || (!target.userId && !target.email)) {
    return NextResponse.json({ error: "A target user is required" }, { status: 400 });
  }
  if (!newRole || !VALID.includes(newRole as Role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // An admin cannot demote themselves into a non-admin lockout by accident.
  if (
    caller &&
    (target.userId === caller.id || target.email === caller.email)
  ) {
    return NextResponse.json(
      { error: "Use your profile settings to review your own role" },
      { status: 400 },
    );
  }

  try {
    await setUserRole(
      { userId: target.userId, email: target.email },
      newRole as Role,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Could not update role" },
      { status: 500 },
    );
  }
}
