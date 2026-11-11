import { createHmac, timingSafeEqual } from "node:crypto";
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

// ───────────────────────────────────────────────────────────────
// Lemon Squeezy adapter (REST / JSON:API).
//
// Implemented against Lemon Squeezy's public REST + webhook docs:
//   checkout : POST https://api.lemonsqueezy.com/v1/checkouts (JSON:API)
//              Bearer <LEMONSQUEEZY_API_KEY>, Accept/Content-Type
//              application/vnd.api+json. Response data.attributes.url.
//   webhook  : x-signature = hex HMAC-SHA256(rawBody, WEBHOOK_SECRET),
//              compared with node:crypto timingSafeEqual.
//   portal   : GET /v1/subscriptions/{id} -> data.attributes.urls.customer_portal
//
// Points that are NOT verifiable from the public docs and should be checked
// against your own Lemon Squeezy account / payloads are called out inline:
//   - where checkout_data.custom is echoed back in webhook payloads,
//   - whether /subscriptions/{id} accepts a customer id or a subscription id,
//   - the exact set of subscription event names / status values.
// Everything downstream consumes NormalizedSubEvent, so the rest of the app
// stays protocol-agnostic.
// ───────────────────────────────────────────────────────────────

// Webhook events we normalise. Anything else is acknowledged and ignored so a
// retry never provisions access twice (the webhook route dedupes on
// eventType + eventId anyway).
const HANDLED_EVENTS = new Set([
  "order_created",
  "order_refunded",
  "subscription_created",
  "subscription_updated",
  "subscription_cancelled",
  "subscription_canceled", // tolerate the single-"l" spelling too
  "subscription_expired",
  "subscription_resumed",
  "subscription_paused",
  "subscription_unpaused",
  "subscription_payment_success",
  "subscription_payment_failed",
  "subscription_payment_recovered",
]);

function normalizeStatus(eventName: string, raw: unknown): NormalizedStatus {
  // Cancellation / expiry / refund events win over attrs.status so we never
  // hand out a license on the back of a cancellation notification.
  if (/cancel|expire|refund/i.test(eventName)) return "canceled";
  if (eventName === "subscription_payment_failed") return "past_due";
  const s = String(raw ?? "").toLowerCase();
  switch (s) {
    case "active":
    case "paid":
      return "active";
    case "on_trial":
    case "trialing":
    case "trial":
      return "trialing";
    case "cancelled":
    case "canceled":
    case "expired":
    case "unpaid":
      return "canceled";
    case "past_due":
    case "paused":
      return "past_due";
    case "incomplete":
    case "pending":
      return "incomplete";
    default:
      return "unknown";
  }
}

/**
 * Resolve the plan. Checkout sends checkout_data.custom.plan; fall back to the
 * variant-id mapping (priceForPlan) so the two directions stay consistent.
 * Where Lemon Squeezy echoes custom data in webhook payloads varies by event —
 * 需按你的 Lemon Squeezy 账户核对 (we read several plausible locations).
 */
function planFromCustom(
  custom: any,
  variantId: unknown,
): PlanId | undefined {
  const raw = custom?.plan ?? custom?.planId ?? custom?.plan_id;
  if (raw === "buyout" || raw === "care") return raw;
  if (raw === "pro") return "buyout";
  if (raw === "scale") return "care";
  const v = String(variantId ?? "");
  if (!v) return undefined;
  if (v === priceForPlan("buyout") || v === priceForPlanBf("buyout")) return "buyout";
  if (v === priceForPlan("care") || v === priceForPlanBf("care")) return "care";
  return undefined;
}

export const lemonsqueezyProvider: PaymentProvider = {
  name: "lemonsqueezy",
  label: "Lemon Squeezy",

  async createCheckout(p: CheckoutParams): Promise<CheckoutResult> {
    // Variant ids play the same role as price ids here; we reuse priceForPlan()
    // so createCheckout and webhook plan resolution share one mapping.
    const variantId = p.blackFriday
      ? priceForPlanBf(p.plan) ?? priceForPlan(p.plan)
      : priceForPlan(p.plan);
    if (!variantId) {
      throw new Error(
        `No Lemon Squeezy variant configured for plan "${p.plan}". Set LEMONSQUEEZY_VARIANT_ID_BUYOUT / LEMONSQUEEZY_VARIANT_ID_CARE.`,
      );
    }

    const body = {
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: p.customerEmail ?? "",
            // Echoed back on webhook payloads (meta.custom_data on most
            // events) so we can attribute the order to a user + plan.
            custom: {
              userId: p.userId ?? "",
              plan: p.plan,
            },
          },
        },
        relationships: {
          store: {
            data: { type: "stores", id: String(env.lemonsqueezyStoreId()) },
          },
          variant: {
            data: { type: "variants", id: String(variantId) },
          },
        },
      },
    };

    const res = await fetch(`${env.lemonsqueezyApiBase()}/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.lemonsqueezyApiKey()}`,
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        json?.errors?.[0]?.detail ?? json?.message ?? res.statusText;
      throw new Error(
        `Lemon Squeezy checkout failed (${res.status}): ${msg}`,
      );
    }

    const url = json?.data?.attributes?.url;
    if (!url) {
      throw new Error(
        "Lemon Squeezy did not return data.attributes.url. Check LEMONSQUEEZY_STORE_ID and LEMONSQUEEZY_VARIANT_ID_*.",
      );
    }
    return { url: String(url) };
  },

  async verifyWebhook(
    rawBody: string,
    headers: Record<string, string | undefined>,
  ): Promise<NormalizedSubEvent[]> {
    const signature = headers["x-signature"];
    // A missing secret is a deployment error; the route logs it and replies 400
    // so the gateway stops retrying until an operator fixes the configuration.
    let secret: string;
    try {
      secret = env.lemonsqueezyWebhookSecret();
    } catch {
      throw new Error("LEMONSQUEEZY_WEBHOOK_SECRET is not configured");
    }
    if (!signature) throw new Error("Missing X-Signature header");
    if (!secret) throw new Error("LEMONSQUEEZY_WEBHOOK_SECRET is empty");

    const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(digest, "utf8");
    const b = Buffer.from(signature, "utf8");
    // timingSafeEqual throws on length mismatch — guard first, and compare in
    // constant time otherwise. Lemon Squeezy signs the RAW body.
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new Error("Invalid Lemon Squeezy webhook signature");
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new Error("Invalid Lemon Squeezy webhook JSON");
    }

    const eventName = String(payload?.meta?.event_name ?? "");
    if (!HANDLED_EVENTS.has(eventName)) return [];

    const data = payload?.data ?? {};
    const attrs = data?.attributes ?? {};

    // custom data location varies by event — 需按你的 Lemon Squeezy 账户核对.
    const custom =
      payload?.meta?.custom_data ??
      attrs?.custom_data ??
      attrs?.checkout_data?.custom ??
      {};

    const status = normalizeStatus(eventName, attrs?.status);
    if (status === "unknown") return [];

    // data.attributes.urls.customer_portal is the portal URL source; the
    // NormalizedSubEvent interface has no field for it, so createPortalSession()
    // re-reads it via GET /v1/subscriptions/{id} (see below).
    const periodEndRaw = attrs?.renews_at ?? attrs?.ends_at;
    const periodEnd =
      typeof periodEndRaw === "string" &&
      !Number.isNaN(Date.parse(periodEndRaw))
        ? new Date(periodEndRaw).toISOString()
        : null;

    const rawUserId = custom?.userId ?? custom?.user_id;
    const subscriptionId = String(data?.id ?? attrs?.subscription_id ?? "");

    return [
      {
        userId: rawUserId ? String(rawUserId) : undefined,
        customerId: String(attrs?.customer_id ?? ""),
        subscriptionId,
        status,
        plan: planFromCustom(custom, attrs?.variant_id),
        periodEnd,
        email: attrs?.user_email ? String(attrs.user_email) : undefined,
        eventType: eventName,
        eventId: String(
          payload?.meta?.event_id ?? `${eventName}:${data?.id ?? ""}`,
        ),
        orderId:
          eventName.startsWith("order_") && data?.id
            ? String(data.id)
            : undefined,
        grantsAccess: status === "active" || status === "trialing",
        amount: toMajor(
          attrs?.total != null ? Number(attrs.total) : undefined,
          attrs?.currency,
        ),
        currency: attrs?.currency ? String(attrs.currency) : undefined,
      },
    ];
  },

  async createPortalSession(p: PortalParams): Promise<PortalResult | null> {
    if (!p.customerId) return null;
    try {
      // The public docs expose the customer portal URL on a subscription
      // object. Whether {id} here is a customer id or a subscription id depends
      // on what the site stored — 需按你的 Lemon Squeezy 账户核对. A miss
      // returns null and the UI falls back to "contact support".
      const res = await fetch(
        `${env.lemonsqueezyApiBase()}/subscriptions/${encodeURIComponent(
          p.customerId,
        )}`,
        {
          headers: {
            Authorization: `Bearer ${env.lemonsqueezyApiKey()}`,
            Accept: "application/vnd.api+json",
          },
          signal: AbortSignal.timeout(20_000),
        },
      );
      if (!res.ok) return null;
      const json: any = await res.json().catch(() => ({}));
      const url = json?.data?.attributes?.urls?.customer_portal;
      return url ? { url: String(url) } : null;
    } catch {
      return null;
    }
  },
};
