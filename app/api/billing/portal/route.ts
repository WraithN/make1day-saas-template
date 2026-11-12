import { guardApiWrite } from "@/lib/http-guard";
import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentSubscription } from "@/lib/subscriptions";
import { getPaymentProvider } from "@/lib/payments";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Create a customer billing-portal session for the signed-in user so they can
 * self-manage their subscription (update card, cancel, view invoices) without
 * operator involvement. Only works when the user has an active subscription
 * tied to a gateway customer and the provider exposes a portal (Stripe/Creem);
 * otherwise it returns 422 with a `reason` the UI can act on.
 */
export async function POST(req: Request) {
  const blocked = await guardApiWrite(req, {
    bucket: "billing-portal",
    limit: 30,
    windowMs: 3600000,
  });
  if (blocked) return blocked;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const sub = await getCurrentSubscription();
  if (!sub || !isSubscribed(sub.status)) {
    return NextResponse.json(
      { error: "No active subscription", reason: "no_subscription" },
      { status: 422 },
    );
  }
  const provider = getPaymentProvider();
  // Waffo Pancake has no gateway customer ids: its portal SSO signs the
  // person in with the SAME buyer email that was passed at checkout, so an
  // email on file is enough — don't block the online cancellation flow just
  // because provider_customer_id is empty.
  if (!sub.provider_customer_id && !(provider.name === "waffo" && user.email)) {
    return NextResponse.json(
      { error: "No billing customer on file", reason: "no_customer" },
      { status: 422 },
    );
  }

  const portal = provider.createPortalSession
    ? await provider
        .createPortalSession({
          customerId: sub.provider_customer_id ?? "",
          returnUrl: `${env.siteUrl()}/account/billing`,
          buyerEmail: user.email ?? undefined,
        })
        .catch((err) => {
          logger.warn("portal session failed", {
            provider: provider.name,
            err: (err as Error).message,
          });
          return null;
        })
    : null;

  if (!portal?.url) {
    return NextResponse.json(
      {
        error: "Provider has no self-serve portal",
        reason: "unsupported_provider",
        provider: provider.name,
      },
      { status: 422 },
    );
  }

  return NextResponse.json({ url: portal.url });
}

function isSubscribed(status: string): boolean {
  return status === "active" || status === "trialing";
}
