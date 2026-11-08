import { env, priceForPlan, priceForPlanBf, priceForPlanMgm } from "@/lib/env";
import type {
  CheckoutParams,
  CheckoutResult,
  NormalizedStatus,
  NormalizedSubEvent,
  PaymentProvider,
} from "./types";

function baseUrl(): string {
  return env.paypalEnv() === "live"
    ? "https://api.paypal.com"
    : "https://api.sandbox.paypal.com";
}

// ── Access token cache ─────────────────────────────────────────
let _token: { value: string; expiresAt: number } | null = null;
async function getToken(): Promise<string> {
  if (_token && _token.expiresAt > Date.now() + 60_000) return _token.value;
  const auth = Buffer.from(`${env.paypalClientId()}:${env.paypalClientSecret()}`).toString(
    "base64",
  );
  const res = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  _token = { value: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return _token.value;
}

async function paypalFetch(path: string, init?: RequestInit): Promise<any> {
  const token = await getToken();
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  return res.json();
}

function planFromPaypalPlan(planId: string | null | undefined): "buyout" | "care" | undefined {
  if (!planId) return undefined;
  if (planId === priceForPlan("buyout") || planId === priceForPlanBf("buyout") || planId === priceForPlanMgm("buyout")) return "buyout";
  if (planId === priceForPlan("care") || planId === priceForPlanBf("care") || planId === priceForPlanMgm("care")) return "care";
  return undefined;
}

function normalizeStatus(s: string): NormalizedStatus {
  switch (s.toUpperCase()) {
    case "ACTIVE":
      return "active";
    case "TRIaling":
    case "PENDING":
      return "trialing";
    case "SUSPENDED":
      return "past_due";
    case "CANCELLED":
    case "EXPIRED":
      return "canceled";
    default:
      return "unknown";
  }
}

export const paypalProvider: PaymentProvider = {
  name: "paypal",
  label: "PayPal",

  async createCheckout(p: CheckoutParams): Promise<CheckoutResult> {
    const planId = p.blackFriday
      ? priceForPlanBf(p.plan) ?? priceForPlan(p.plan)
      : priceForPlan(p.plan);
    if (!planId) throw new Error(`No PayPal plan configured for plan "${p.plan}"`);
    const data = await paypalFetch("/v1/billing/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        plan_id: planId,
        subscriber: p.customerEmail ? { email_address: p.customerEmail } : undefined,
        application_context: {
          return_url: p.successUrl,
          cancel_url: p.cancelUrl,
          user_action: "SUBSCRIBE_NOW",
        },
      }),
    });
    const approve = (data.links ?? []).find((l: any) => l.rel === "approve");
    return { orderId: data.id, approvalUrl: approve?.href };
  },

  async verifyWebhook(
    rawBody: string,
    headers: Record<string, string | undefined>,
  ): Promise<NormalizedSubEvent[]> {
    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      throw new Error("Invalid PayPal webhook JSON");
    }

    // PayPal's own signature-verification endpoint.
    const verifyRes = await paypalFetch("/v1/notifications/verify-webhook-signature", {
      method: "POST",
      body: JSON.stringify({
        auth_algo: headers["paypal-auth-algo"],
        cert_url: headers["paypal-cert-url"],
        transmission_id: headers["paypal-transmission-id"],
        transmission_sig: headers["paypal-transmission-sig"],
        transmission_time: headers["paypal-transmission-time"],
        webhook_id: env.paypalWebhookId(),
        webhook_event: event,
      }),
    });
    if (verifyRes.verification_status !== "SUCCESS") {
      throw new Error("PayPal webhook signature verification failed");
    }

    const out: NormalizedSubEvent[] = [];
    const type: string = event.event_type ?? "";
    if (type.startsWith("BILLING.SUBSCRIPTION") || type.startsWith("PAYMENT.SALE")) {
      const r = event.resource ?? {};
      const subscriptionId = r.id ?? r.billing_agreement_id ?? r.subscription_id ?? "";
      const periodEnd = r.billing_info?.next_billing_time ?? r.next_billing_time ?? null;
      const payAmount = r.billing_info?.last_payment?.amount;
      const buyerEmail: string | undefined =
        r.subscriber?.email_address ?? r.payer_email ?? undefined;
      out.push({
        customerId: buyerEmail ?? r.id ?? "",
        subscriptionId: String(subscriptionId),
        status: normalizeStatus(r.status ?? "ACTIVE"),
        plan: planFromPaypalPlan(r.plan_id ?? r.plan?.id),
        periodEnd,
        // Same contract as the other gateways: a completed payment must carry
        // the fields the shared webhook needs to issue a license. Without
        // grantsAccess the buyer pays but never receives the ZIP.
        email: buyerEmail,
        eventType: type,
        eventId: String(event.id ?? `${type}:${subscriptionId}`),
        orderId: String(r.id ?? subscriptionId),
        grantsAccess:
          (type === "PAYMENT.SALE.COMPLETED" ||
            type === "BILLING.SUBSCRIPTION.ACTIVATED") &&
          Boolean(buyerEmail),
        amount: payAmount ? Number(payAmount.value) : undefined,
        currency: payAmount?.currency_code ?? undefined,
      });
    }
    return out;
  },
};
