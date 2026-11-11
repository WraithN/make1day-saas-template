import { createHmac, timingSafeEqual } from "node:crypto";
import { env, priceForPlan, priceForPlanBf } from "@/lib/env";
import { logger } from "@/lib/logger";
import type {
  CheckoutParams,
  CheckoutResult,
  NormalizedStatus,
  NormalizedSubEvent,
  PaymentProvider,
  PortalParams,
  PortalResult,
} from "./types";
import { toMajor } from "./types";

// Creem base URL depends on the environment flag.
function baseUrl(): string {
  return env.creemEnv() === "live" ? "https://api.creem.io/v1" : "https://test-api.creem.io/v1";
}

function planFromProduct(productId: string | null | undefined): "buyout" | "care" | undefined {
  if (!productId) return undefined;
  if (productId === priceForPlan("buyout") || productId === priceForPlanBf("buyout")) return "buyout";
  if (productId === priceForPlan("care") || productId === priceForPlanBf("care")) return "care";
  return undefined;
}

function normalizeStatus(s: string): NormalizedStatus {
  switch (s.toLowerCase()) {
    case "active":
    case "paid":
    case "completed":
      return "active";
    case "canceled":
    case "cancelled":
    case "expired":
      return "canceled";
    case "unpaid":
    case "past_due":
      return "past_due";
    default:
      return "unknown";
  }
}

async function creemFetch(path: string, init?: RequestInit): Promise<any> {
  const t0 = Date.now();
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    // Vercel kills a hanging function at the edge (opaque 502, no lambda
    // log). Fail fast with a catchable, logged error instead.
    signal: AbortSignal.timeout(9000),
    headers: {
      "x-api-key": env.creemApiKey(),
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  logger.info("creem api call", {
    path,
    status: res.status,
    ms: Date.now() - t0,
  });
  if (!res.ok) {
    throw new Error(`creem_http_${res.status}: ${text.slice(0, 200)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`creem_bad_json_${res.status}: ${text.slice(0, 200)}`);
  }
}

export const creemProvider: PaymentProvider = {
  name: "creem",
  label: "Creem",

  async createCheckout(p: CheckoutParams): Promise<CheckoutResult> {
    const productId = p.blackFriday
      ? priceForPlanBf(p.plan) ?? priceForPlan(p.plan)
      : priceForPlan(p.plan);
    if (!productId) throw new Error(`No Creem product configured for plan "${p.plan}"`);
    const data = await creemFetch("/checkouts", {
      method: "POST",
      body: JSON.stringify({
        product_id: productId,
        // Creem's hosted checkout page collects the buyer email itself; the
        // create-checkout schema REJECTS customer_email (400 "property
        // customer_email should not exist"). The paid event carries the email
        // the buyer typed there, which is what the webhook grants to.
        success_url: p.successUrl,
        // Creem stores arbitrary metadata on the checkout.
        metadata: { userId: p.userId ?? "" },
      }),
    });
    return { url: data.checkout_url ?? data.url ?? undefined };
  },

  async verifyWebhook(
    rawBody: string,
    headers: Record<string, string | undefined>,
  ): Promise<NormalizedSubEvent[]> {
    const signature = headers["creem-signature"];
    if (!signature) throw new Error("Missing creem-signature header");
    // Creem delivers TWO signature formats: the documented plain
    // HMAC-SHA256 hex digest over the raw body, and a newer Stripe-style
    // "t=<timestamp>,v1=<hex>" scheme (used by dashboard test events and
    // newer accounts). Accept both so a test event or account-migration
    // never fails verification.
    let expectedHex: string;
    const parts = signature.split(",").reduce<Record<string, string>>((acc, p) => {
      const [k, v] = p.split("=");
      if (k && v) acc[k.trim()] = v.trim();
      return acc;
    }, {});
    if (parts.v1) {
      expectedHex = parts.v1;
    } else {
      expectedHex = signature.trim();
    }
    const expected = createHmac("sha256", env.creemWebhookSecret())
      .update(rawBody)
      .digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(expectedHex);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new Error("Invalid Creem webhook signature");
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new Error("Invalid Creem webhook JSON");
    }

    const out: NormalizedSubEvent[] = [];
    const obj = payload.object ?? payload;
    // Creem delivers the event type as `eventType`; older doc drafts showed
    // `event_type` / `type`. Accept all three — an unmatched type used to
    // return an empty event list, i.e. a paid checkout silently ignored.
    const eventType: string =
      payload.eventType ?? payload.event_type ?? payload.type ?? "";
    // Per Creem's checkout.completed sample the money lives on `order` and a
    // recurring checkout nests its subscription under `subscription`.
    const order = obj.order ?? {};
    const subscription = obj.subscription ?? {};

    if (eventType === "checkout.completed" || eventType.includes("subscription")) {
      const subscriptionId = String(
        subscription.id ?? obj.subscription_id ?? obj.id ?? "",
      );
      const customerId = String(
        obj.customer?.id ??
          obj.customer_id ??
          order.customer ??
          (typeof obj.customer === "string" ? obj.customer : "") ??
          "",
      );
      const productId =
        obj.product?.id ?? obj.product_id ?? order.product ?? null;
      const periodEndEpoch =
        obj.current_period_end ?? subscription.current_period_end ?? null;
      const periodEndIso =
        obj.current_period_end_date ??
        subscription.current_period_end_date ??
        null;
      const periodEnd = periodEndEpoch
        ? new Date(Number(periodEndEpoch) * 1000).toISOString()
        : periodEndIso ?? null;
      const buyerEmail: string | undefined =
        obj.customer?.email ?? obj.customer_email ?? obj.email ?? undefined;
      const userId: string | undefined = obj.metadata?.userId || undefined;
      out.push({
        userId,
        customerId,
        subscriptionId,
        status: normalizeStatus(obj.status ?? subscription.status ?? "active"),
        plan: planFromProduct(productId),
        periodEnd,
        // Paid checkout must grant the download license — see the shared
        // webhook route (grantLicense requires grantsAccess + plan + an
        // email/userId to attribute the key to). Subscription updates keep
        // grantsAccess unset because they cannot always identify the buyer.
        email: buyerEmail,
        eventType,
        eventId: String(payload.id ?? obj.id ?? subscriptionId),
        orderId: String(order.id ?? obj.id ?? subscriptionId),
        grantsAccess:
          eventType === "checkout.completed" &&
          (Boolean(buyerEmail) || Boolean(userId)),
        amount: toMajor(
          order.amount ?? obj.amount,
          order.currency ?? obj.currency,
        ),
        currency: order.currency ?? obj.currency ?? undefined,
      });
    }
    return out;
  },

  async createPortalSession(p: PortalParams): Promise<PortalResult | null> {
    if (!p.customerId) return null;
    // Creem's hosted customer portal. Endpoint/shape may differ by account;
    // wrap in try/catch so a missing/again endpoint degrades to the fallback
    // "contact support" UI rather than crashing the request.
    try {
      const data = await creemFetch(
        `/customers/${encodeURIComponent(p.customerId)}/portal-sessions`,
        {
          method: "POST",
          body: JSON.stringify({ return_url: p.returnUrl }),
        },
      );
      const url = data?.portal_url ?? data?.url ?? data?.checkout_url;
      return url ? { url } : null;
    } catch {
      return null;
    }
  },
};
