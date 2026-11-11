import Stripe from "stripe";
import { env, priceForPlan, priceForPlanBf } from "@/lib/env";
import type {
  CheckoutParams,
  CheckoutResult,
  NormalizedStatus,
  NormalizedSubEvent,
  PaymentProvider,
  PlanId,
  PortalParams,
  PortalResult,
} from "./types";
import { toMajor } from "./types";

// Lazily construct the Stripe client (never at import time).
let _stripe: Stripe | null = null;
function stripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(env.stripeSecretKey(), {
      apiVersion: "2024-12-18" as Stripe.LatestApiVersion,
      typescript: true,
    });
  }
  return _stripe;
}

function normalizeStatus(s: string): NormalizedStatus {
  switch (s) {
    case "active":
    case "trialing":
    case "canceled":
    case "past_due":
    case "incomplete":
      return s;
    default:
      return "unknown";
  }
}

function planFromPrice(priceId: string | null | undefined): PlanId | undefined {
  if (!priceId) return undefined;
  if (priceId === priceForPlan("buyout") || priceId === priceForPlanBf("buyout")) return "buyout";
  if (priceId === priceForPlan("care") || priceId === priceForPlanBf("care")) return "care";
  return undefined;
}

export const stripeProvider: PaymentProvider = {
  name: "stripe",
  label: "Stripe",

  async createCheckout(p: CheckoutParams): Promise<CheckoutResult> {
    const priceId = p.blackFriday
      ? priceForPlanBf(p.plan) ?? priceForPlan(p.plan)
      : priceForPlan(p.plan);
    if (!priceId) throw new Error(`No Stripe price configured for plan "${p.plan}"`);

    // Buyout is a one-time payment — it must not create a subscription or a
    // trial. Care (and the legacy pro/scale slots) stay recurring.
    const oneTime = p.plan === "buyout" || p.plan === "pro";
    const session = await stripe().checkout.sessions.create({
      mode: oneTime ? "payment" : "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: p.customerEmail,
      client_reference_id: p.userId,
      success_url: p.successUrl,
      cancel_url: p.cancelUrl,
      allow_promotion_codes: true,
      ...(oneTime
        ? {
            payment_intent_data: {
              metadata: { plan: "buyout", userId: p.userId ?? "" },
            },
          }
        : { subscription_data: { trial_period_days: 14 } }),
    });
    return { url: session.url ?? undefined };
  },

  async verifyWebhook(
    rawBody: string,
    headers: Record<string, string | undefined>,
  ): Promise<NormalizedSubEvent[]> {
    const signature = headers["stripe-signature"];
    if (!signature) throw new Error("Missing Stripe-Signature header");
    let event: Stripe.Event;
    try {
      event = stripe().webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret());
    } catch {
      throw new Error("Invalid Stripe webhook signature");
    }

    const out: NormalizedSubEvent[] = [];
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      const buyerEmail = s.customer_details?.email ?? s.customer_email ?? undefined;
      out.push({
        userId: s.client_reference_id ?? undefined,
        customerId: String(s.customer ?? s.customer_email ?? ""),
        // A one-time Buyout has no subscription — use the payment intent.
        subscriptionId: String(s.subscription ?? s.payment_intent ?? s.id),
        status: s.payment_status === "paid" ? "active" : "incomplete",
        plan:
          planFromPrice(s.line_items?.data?.[0]?.price?.id) ??
          (s.mode === "payment" ? "buyout" : undefined),
        // A paid order MUST issue a download license. Without these fields the
        // shared webhook route would only upsert a subscription and the buyer
        // would pay for a ZIP they never receive. Subscription updates below
        // deliberately do NOT set grantsAccess: they carry no buyer email, and
        // the license was already issued by the original checkout event.
        email: buyerEmail,
        eventType: event.type,
        eventId: event.id,
        orderId: String(s.payment_intent ?? s.id),
        grantsAccess:
          s.payment_status === "paid" &&
          (Boolean(buyerEmail) || Boolean(s.client_reference_id)),
        amount: toMajor(
          s.amount_total ?? s.line_items?.data?.[0]?.price?.unit_amount ?? undefined,
          s.currency ?? undefined,
        ),
        currency: s.currency ?? undefined,
      });
    } else if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const s = event.data.object as Stripe.Subscription;
      const periodEnd = s.current_period_end
        ? new Date(s.current_period_end * 1000).toISOString()
        : null;
      out.push({
        customerId: String(s.customer),
        subscriptionId: s.id,
        status: normalizeStatus(s.status),
        periodEnd,
        eventType: event.type,
        eventId: event.id,
        plan: planFromPrice(s.items.data[0]?.price?.id),
        amount: toMajor(
          s.items?.data?.[0]?.price?.unit_amount ?? undefined,
          s.items?.data?.[0]?.price?.currency,
        ),
        currency: s.items?.data?.[0]?.price?.currency ?? undefined,
      });
    }
    return out;
  },

  async createPortalSession(p: PortalParams): Promise<PortalResult | null> {
    if (!p.customerId) return null;
    const session = await stripe().billingPortal.sessions.create({
      customer: p.customerId,
      return_url: p.returnUrl,
    });
    return session.url ? { url: session.url } : null;
  },
};
