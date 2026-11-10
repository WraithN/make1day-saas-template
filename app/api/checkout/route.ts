import { guardApiWrite } from "@/lib/http-guard";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments";
import { env, primaryPaymentsReady } from "@/lib/env";
import { logger } from "@/lib/logger";
import { recordTrafficEvent } from "@/lib/traffic";
import { resolveIdentity } from "@/lib/visitor-id";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // While the payment provider is unconfigured (e.g. Creem approval pending)
  // the buy buttons render as "coming soon"; this guard makes the API agree
  // instead of failing deep inside the provider adapter.
  if (!primaryPaymentsReady()) {
    return NextResponse.json({ error: "checkout_unavailable" }, { status: 503 });
  }
  const blocked = await guardApiWrite(req, {
    bucket: "checkout",
    limit: 30,
    windowMs: 3600000,
  });
  if (blocked) return blocked;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = z
    .object({ plan: z.enum(["buyout", "care"]), blackFriday: z.boolean().optional() })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const provider = getPaymentProvider();
  try {
    const result = await provider.createCheckout({
      plan: parsed.data.plan,
      customerEmail: user.email ?? undefined,
      userId: user.id,
      successUrl: `${env.siteUrl()}/account?welcome=1`,
      cancelUrl: `${env.siteUrl()}/pricing`,
      blackFriday: parsed.data.blackFriday ?? false,
    });
    // Normalise to a single redirect URL (Stripe/Creem/Waffo use `url`,
    // PayPal uses `approvalUrl`).
    const url = result.url ?? result.approvalUrl;
    if (!url) {
      return NextResponse.json(
        { error: "Provider did not return a checkout URL" },
        { status: 502 },
      );
    }

    // Funnel step "checkout started". The email is stored so the payment
    // webhook can attribute the eventual conversion back to this session.
    const identity = resolveIdentity(req.headers.get("cookie"));
    await recordTrafficEvent({
      visitorId: identity.visitorId,
      sessionId: identity.sessionId,
      kind: "checkout",
      path: "/pricing",
      label: parsed.data.plan,
      email: user.email ?? null,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ url });
  } catch (e) {
    logger.error("checkout failed", {
      userId: user?.id,
      plan: parsed.success ? parsed.data.plan : undefined,
      err: (e as Error).message,
    });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
