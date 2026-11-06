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
export async function POST() {
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
  if (!sub.provider_customer_id) {
    return NextResponse.json(
      { error: "No billing customer on file", reason: "no_customer" },
      { status: 422 },
    );
  }

  const provider = getPaymentProvider();
  const portal = provider.createPortalSession
    ? await provider
        .createPortalSession({
          customerId: sub.provider_customer_id,
          returnUrl: `${env.siteUrl()}/account/billing`,
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
