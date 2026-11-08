import { guardApiWrite } from "@/lib/http-guard";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/subscriptions";
import { createOrg } from "@/lib/org";
import { ACTIVE_ORG_COOKIE } from "@/lib/org";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// Create a new workspace/org for the signed-in user (they become owner) and
// switch the active org to it.
export async function POST(req: Request) {
  const blocked = await guardApiWrite(req, {
    bucket: "org-write",
    limit: 30,
    windowMs: 3600000,
  });
  if (blocked) return blocked;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  let body: { name?: string };
  try {
    body = (await req.json()) as { name?: string };
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  if (name.length < 2) {
    return NextResponse.json({ error: "Name too short" }, { status: 400 });
  }
  try {
    const orgId = await createOrg(name, user.id);
    const res = NextResponse.json({ ok: true, orgId });
    res.cookies.set(ACTIVE_ORG_COOKIE, orgId, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });
    return res;
  } catch (err) {
    logger.error("createOrg failed", { userId: user.id, err: (err as Error).message });
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
