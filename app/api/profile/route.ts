import { guardApiWrite } from "@/lib/http-guard";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/subscriptions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { productId } from "@/lib/product";

export const dynamic = "force-dynamic";

const MAX = 80;

function clean(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, MAX);
  return t.length ? t : null;
}

/**
 * GET the signed-in user's own profile (display name, company, role, …).
 * Returns 401 when there is no session. Safe to call from the client form.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, full_name, company, role, created_at, updated_at")
      .eq("id", user.id)
      .eq("product", productId())
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ profile: data ?? null });
  } catch {
    // Missing table / misconfig: still report the auth identity.
    return NextResponse.json({ profile: null });
  }
}

/**
 * PATCH the signed-in user's own editable profile fields.
 * `role` is deliberately NOT accepted here — role changes go through the
 * service-role admin endpoint, and the profiles self-update RLS policy also
 * blocks self-escalation as defence in depth.
 */
export async function PATCH(request: Request) {
  const blocked = await guardApiWrite(request, {
    bucket: "profile-write",
    limit: 60,
    windowMs: 3600000,
  });
  if (blocked) return blocked;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: Record<string, string | null> = {};
  if ("displayName" in body) patch.display_name = clean(body.displayName);
  if ("fullName" in body) patch.full_name = clean(body.fullName);
  if ("company" in body) patch.company = clean(body.company);

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    // Service role: the composite-key upsert may INSERT a first-time product
    // row, and RLS has no self-insert policy on profiles. Fields are
    // whitelisted above and the id comes from the validated session.
    const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const { data, error } = await createSupabaseAdminClient()
      .from("profiles")
      .upsert(
        { ...patch, id: user.id, product: productId() },
        { onConflict: "id,product" },
      )
      .eq("id", user.id)
      .eq("product", productId())
      .select("display_name, full_name, company, role, updated_at")
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ profile: data ?? null });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Could not update profile" },
      { status: 500 },
    );
  }
}
