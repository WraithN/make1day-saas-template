import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/subscriptions";
import { getUserOrgs, ACTIVE_ORG_COOKIE } from "@/lib/org";

export const dynamic = "force-dynamic";

// Switch the active workspace. Passing orgId:null returns to the personal
// space. Validates the org belongs to the user before setting the cookie.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  let body: { orgId?: string | null };
  try {
    body = (await req.json()) as { orgId?: string | null };
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const orgId = body.orgId ?? null;
  if (orgId) {
    const orgs = await getUserOrgs(user.id);
    if (!orgs.some((o) => o.id === orgId)) {
      return NextResponse.json({ error: "Not a member of that org" }, { status: 403 });
    }
  }

  const res = NextResponse.json({ ok: true, orgId });
  if (orgId) {
    res.cookies.set(ACTIVE_ORG_COOKIE, orgId, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });
  } else {
    res.cookies.delete(ACTIVE_ORG_COOKIE);
  }
  return res;
}
