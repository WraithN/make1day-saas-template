import { createHmac, timingSafeEqual } from "node:crypto";
import { env, priceForPlan } from "@/lib/env";
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
  if (productId === priceForPlan("buyout")) return "buyout";
  if (productId === priceForPlan("care")) return "care";
  return undefined;
}

function normalizeStatus(s: string): NormalizedStatus {
  switch (s.toLowerCase()) {
    case "active":
    case "paid":
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
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "x-api-key": env.creemApiKey(),
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  return res.json();
}

export const creemProvider: PaymentProvider = {
  name: "creem",
  label: "Creem",

  async createCheckout(p: CheckoutParams): Promise<CheckoutResult> {
    const productId = priceForPlan(p.plan);
    if (!productId) throw new Error(`No Creem product configured for plan "${p.plan}"`);
    const data = await creemFetch("/checkouts", {
      method: "POST",
      body: JSON.stringify({
        product_id: productId,
        customer_email: p.customerEmail,
        success_url: p.successUrl,
        // Creem stores arbitrary metadata on the checkout.
        metadata: { userId: p.userId ?? "" },
        // 14-day trial if supported by the product configuration.
      }),
    });
    return { url: data.checkout_url ?? data.url ?? undefined };
  },

  async verifyWebhook(
    rawBody: string,
    headers: Record<string, string | undefined>,
  ): Promise<NormalizedSubEvent[]> {
    const signature = headers["creem-signature"];
    if (!signature) return [];
    const expected = createHmac("sha256", env.creemWebhookSecret())
      .update(rawBody)
      .digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return [];

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return [];
    }

    const out: NormalizedSubEvent[] = [];
    const obj = payload.object ?? payload;
    const eventType: string = payload.event_type ?? payload.type ?? "";

    if (eventType === "checkout.completed" || eventType.includes("subscription")) {
      const subscriptionId = obj.subscription_id ?? obj.id ?? "";
      const customerId = obj.customer_id ?? obj.customer ?? "";
      const productId =
        obj.product?.id ?? obj.product_id ?? obj.product ?? null;
      const periodEnd = obj.current_period_end
        ? new Date(obj.current_period_end * 1000).toISOString()
        : obj.current_period_end ?? null;
      out.push({
        userId: obj.metadata?.userId || undefined,
        customerId: String(customerId),
        subscriptionId: String(subscriptionId),
        status: normalizeStatus(obj.status ?? "active"),
        plan: planFromProduct(productId),
        periodEnd,
        amount: toMajor(obj.amount, obj.currency),
        currency: obj.currency ?? undefined,
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
