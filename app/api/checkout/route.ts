import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments";
import { env } from "@/lib/env";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = z.object({ plan: z.enum(["buyout", "care"]) }).safeParse(body);
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
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
