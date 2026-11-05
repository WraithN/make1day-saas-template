import { createHash, createVerify, sign as rsaSign } from "node:crypto";
import { env, priceForPlan } from "@/lib/env";
import type {
  CheckoutParams,
  CheckoutResult,
  NormalizedStatus,
  NormalizedSubEvent,
  PaymentProvider,
  PlanId,
} from "./types";
import { toMajor } from "./types";

// ───────────────────────────────────────────────────────────────
// Waffo ships TWO incompatible products under the same brand. This adapter
// implements both against their published documentation (2026-11):
//
//  A) `WAFFO_FLAVOR=pancake` (DEFAULT) — Waffo Pancake, the Merchant of
//     Record for digital products / solo founders.
//       docs: https://docs.waffo.ai/llms.txt
//       checkout: POST https://api.waffo.ai/v1/actions/checkout/create-session
//         auth  : X-Store-Slug + X-Environment  OR
//                 X-Merchant-Id + X-Timestamp + X-Signature
//                 (RSA-SHA256 over `METHOD\nPATH\nTS\nSHA256_BASE64(BODY)`)
//         body  : { productId, productType: onetime|subscription, currency,
//                   storeId?, buyerEmail?, metadata?, successUrl? }
//         result: { checkoutUrl }
//       webhook: X-Waffo-Signature: t=<ms>,v1=<base64>
//                verify RSA-SHA256 over `${t}.${rawBody}` with the platform
//                Webhook Public Key (test/prod), 45-minute tolerance.
//
//  B) `WAFFO_FLAVOR=acquiring` — Waffo Acquiring (SE Asia).
//       docs: https://waffo.com/docs/llms.txt
//       webhook: X-SIGNATURE = base64 RSA-SHA256 over the raw body, verified
//                with the Waffo public key; events are *_NOTIFICATION.
//       checkout: POST /api/v1/order/create requires a much larger payload
//                (merchantInfo / userInfo / paymentInfo / notifyUrl …). It is
//                intentionally NOT faked — see createCheckoutAcquiring().
//
// Everything downstream consumes NormalizedSubEvent, so the rest of the app
// (subscriptions, licenses, dashboard) stays protocol-agnostic.
// ───────────────────────────────────────────────────────────────

export function isOneTimePlan(plan: PlanId): boolean {
  return plan === "buyout" || plan === "pro";
}

function isPancake(): boolean {
  return env.waffoFlavor() !== "acquiring";
}

function normalizeStatus(s: unknown): NormalizedStatus {
  switch (String(s ?? "").toLowerCase()) {
    case "active":
    case "paid":
    case "success":
    case "succeeded":
    case "completed":
    case "pay_success":
      return "active";
    case "trial":
    case "trialing":
      return "trialing";
    case "canceled":
    case "cancelled":
    case "refunded":
      return "canceled";
    case "past_due":
    case "overdue":
      return "past_due";
    case "incomplete":
    case "pending":
    case "pay_failed":
      return "incomplete";
    default:
      return "unknown";
  }
}

// ── Pancake: request signing (API Key auth) ────────────────────────────────

function pancakeSignedHeaders(
  method: string,
  reqPath: string,
  bodyStr: string,
): Record<string, string> {
  const merchantId = env.waffoMerchantId();
  const privateKey = env.waffoPrivateKey();
  if (!merchantId || !privateKey) {
    throw new Error(
      "Waffo Pancake API-Key auth requires WAFFO_MERCHANT_ID and WAFFO_PRIVATE_KEY (or set WAFFO_STORE_SLUG for public checkout auth).",
    );
  }
  const ts = Math.floor(Date.now() / 1000).toString();
  const bodyHash = createHash("sha256").update(bodyStr).digest("base64");
  const canonical = `${method}\n${reqPath}\n${ts}\n${bodyHash}`;
  const signature = rsaSign("sha256", Buffer.from(canonical), privateKey).toString(
    "base64",
  );
  return {
    "content-type": "application/json",
    "X-Merchant-Id": merchantId,
    "X-Timestamp": ts,
    "X-Signature": signature,
  };
}

function pancakePublicHeaders(): Record<string, string> {
  const slug = env.waffoStoreSlug();
  if (!slug) {
    throw new Error(
      "Waffo Pancake checkout needs WAFFO_STORE_SLUG (public auth) or WAFFO_MERCHANT_ID + WAFFO_PRIVATE_KEY (signed auth).",
    );
  }
  return {
    "content-type": "application/json",
    "X-Store-Slug": slug,
    "X-Environment": env.waffoEnvironment() === "prod" ? "prod" : "test",
  };
}

async function createCheckoutPancake(
  p: CheckoutParams,
): Promise<CheckoutResult> {
  // In Pancake the "price id" IS the product id: a one-time product for the
  // Buyout license and a subscription product for Care.
  const productId = priceForPlan(p.plan);
  if (!productId) {
    throw new Error(
      `No Waffo Pancake product configured for plan "${p.plan}". Set WAFFO_PRICE_ID_BUYOUT / WAFFO_PRICE_ID_CARE.`,
    );
  }

  const oneTime = isOneTimePlan(p.plan);
  const body: Record<string, unknown> = {
    productId,
    productType: oneTime ? "onetime" : "subscription",
    currency: "USD",
    metadata: {
      plan: oneTime ? "buyout" : "care",
      userId: p.userId ?? "",
      source: "shipkit",
    },
    successUrl: p.successUrl,
  };
  if (env.waffoStoreId()) body.storeId = env.waffoStoreId();
  if (p.customerEmail) body.buyerEmail = p.customerEmail;

  const reqPath = env.waffoCheckoutPath();
  const bodyStr = JSON.stringify(body);
  // Exactly ONE auth method may be sent (Pancake rejects mixed credentials).
  const useSigned =
    !!env.waffoMerchantId() && !!env.waffoPrivateKey();
  const headers = useSigned
    ? pancakeSignedHeaders("POST", reqPath, bodyStr)
    : pancakePublicHeaders();

  const res = await fetch(`${env.waffoApiBase()}${reqPath}`, {
    method: "POST",
    headers,
    body: bodyStr,
    signal: AbortSignal.timeout(20_000),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.errors?.[0]?.message ?? json?.message ?? res.statusText;
    throw new Error(`Waffo Pancake checkout failed (${res.status}): ${msg}`);
  }

  const url =
    json?.data?.checkoutUrl ??
    json?.session?.checkoutUrl ??
    json?.checkoutUrl ??
    json?.data?.url ??
    json?.url;
  if (!url) {
    throw new Error(
      "Waffo Pancake did not return a checkoutUrl. Check WAFFO_PRICE_ID_* and WAFFO_STORE_SLUG / merchant credentials.",
    );
  }
  return { url: String(url) };
}

/**
 * Waffo Acquiring creates an order with a large merchant-specific payload
 * (`merchantInfo`, `userInfo`, `paymentInfo`, `notifyUrl`, `orderAmount`, …).
 * Those values come from your Waffo contract, so we refuse to invent them.
 * Either use Pancake (recommended for digital products) or wire the official
 * SDK into this function — see docs/waffo.md.
 */
async function createCheckoutAcquiring(
  _p: CheckoutParams,
): Promise<CheckoutResult> {
  throw new Error(
    "WAFFO_FLAVOR=acquiring requires the full /api/v1/order/create payload (merchantInfo/userInfo/paymentInfo/notifyUrl) from your Waffo contract. Use WAFFO_FLAVOR=pancake for digital products, or implement createCheckoutAcquiring() with the official SDK. See docs/waffo.md.",
  );
}

// ── Pancake: webhook verification ─────────────────────────────────────────

function parsePancakeSignature(header: string): { t: string; v1: string } {
  const t = /t=(\d+)/.exec(header)?.[1];
  const v1 = /v1=([^,\s]+)/.exec(header)?.[1];
  if (!t || !v1) throw new Error("Malformed X-Waffo-Signature header");
  return { t, v1 };
}

function pancakePublicKeyForMode(mode: string): string {
  const key =
    mode === "prod"
      ? env.waffoWebhookPublicKeyProd() || env.waffoWebhookPublicKey()
      : env.waffoWebhookPublicKeyTest() || env.waffoWebhookPublicKey();
  if (!key) {
    throw new Error(
      `Waffo Pancake webhook public key for "${mode}" is not configured. Set WAFFO_WEBHOOK_PUBLIC_KEY_TEST / _PROD (Dashboard → Settings → Webhooks).`,
    );
  }
  return key;
}

function verifyPancakeWebhook(
  rawBody: string,
  headers: Record<string, string | undefined>,
): any {
  const header = headers["x-waffo-signature"];
  if (!header) throw new Error("Missing X-Waffo-Signature header");
  const { t, v1 } = parsePancakeSignature(header);

  // Retries reuse the ORIGINAL signature, so Waffo documents a 45-minute
  // tolerance (a 5-minute window would reject legitimate retries).
  if (Math.abs(Date.now() - Number(t)) > 45 * 60 * 1000) {
    throw new Error("Waffo webhook signature timestamp outside tolerance");
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new Error("Invalid Waffo webhook JSON");
  }

  const key = pancakePublicKeyForMode(String(payload.mode ?? "test"));
  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${t}.${rawBody}`);
  if (!verifier.verify(key, v1, "base64")) {
    throw new Error("Invalid Waffo Pancake webhook signature");
  }
  return payload;
}

/** Pancake event → NormalizedSubEvent. Returns [] for ignored events. */
function normalizePancakeEvent(payload: any): NormalizedSubEvent[] {
  const type = String(payload?.eventType ?? "");
  const data = payload?.data ?? {};
  const meta = data?.orderMetadata ?? data?.metadata ?? {};

  // Documented: subscription.payment_succeeded is a pure payment receipt.
  // Provisioning on it AND on subscription.activated would onboard twice.
  if (type === "subscription.payment_succeeded") return [];

  let status: NormalizedStatus;
  switch (type) {
    case "order.completed":
      status = "active";
      break;
    case "subscription.activated":
    case "subscription.renewed":
    case "subscription.recovered":
    case "subscription.canceling": // access lasts until currentPeriodEnd
    case "subscription.plan_changed":
    case "subscription.plan_change_scheduled":
      status = "active";
      break;
    case "subscription.canceled":
    case "refund.succeeded":
      status = "canceled";
      break;
    case "subscription.past_due":
      status = "past_due";
      break;
    case "refund.failed":
      status = "active";
      break;
    default:
      return []; // unhandled event → acknowledge, persist nothing
  }

  const plan: PlanId | undefined =
    meta?.plan === "buyout" || meta?.plan === "care"
      ? meta.plan
      : type === "order.completed"
        ? "buyout"
        : "care";

  const identifier =
    data?.paymentId ?? data?.orderId ?? payload?.eventId ?? payload?.id;
  if (!identifier) return [];

  const periodEndRaw = data?.currentPeriodEnd;
  const periodEnd =
    typeof periodEndRaw === "string" && !Number.isNaN(Date.parse(periodEndRaw))
      ? new Date(periodEndRaw).toISOString()
      : null;

  return [
    {
      userId:
        meta?.userId ||
        data?.merchantProvidedBuyerIdentity?.userId ||
        undefined,
      customerId: String(data?.buyerEmail ?? data?.orderId ?? ""),
      subscriptionId: String(identifier),
      status,
      plan,
      periodEnd,
      email: data?.buyerEmail ?? undefined,
      eventType: type,
      eventId: String(payload?.eventId ?? payload?.id ?? identifier),
      orderId: data?.orderId ? String(data.orderId) : undefined,
      grantsAccess: status === "active",
      amount: toMajor(data?.amount, data?.currency),
      currency: data?.currency ?? undefined,
    },
  ];
}

// ── Acquiring: webhook verification ───────────────────────────────────────

function verifyAcquiringWebhook(
  rawBody: string,
  headers: Record<string, string | undefined>,
): any {
  const signature = headers["x-signature"];
  if (!signature) throw new Error("Missing Waffo X-SIGNATURE header");
  const key = env.waffoWebhookPublicKey();
  if (!key) {
    throw new Error(
      "WAFFO_PUBLIC_KEY / WAFFO_WEBHOOK_PUBLIC_KEY is required to verify Waffo Acquiring webhooks.",
    );
  }
  const verifier = createVerify("SHA256");
  verifier.update(rawBody);
  if (!verifier.verify(key, signature, "base64")) {
    throw new Error("Invalid Waffo Acquiring webhook signature");
  }
  return JSON.parse(rawBody);
}

function normalizeAcquiringEvent(payload: any): NormalizedSubEvent[] {
  const type = String(payload?.eventType ?? payload?.type ?? "");
  const obj = payload?.result ?? payload?.data ?? payload;
  const isPayment = /PAYMENT_NOTIFICATION|SUBSCRIPTION|CHECKOUT|ORDER/i.test(
    type,
  );
  if (!isPayment) return [];

  const rawStatus = obj?.orderStatus ?? obj?.status ?? obj?.paymentStatus;
  let status: NormalizedStatus;
  if (String(rawStatus).toUpperCase() === "PAY_SUCCESS") status = "active";
  else if (/CANCEL/i.test(String(rawStatus))) status = "canceled";
  else if (/FAIL|OVERDUE/i.test(String(rawStatus))) status = "past_due";
  else status = normalizeStatus(rawStatus);
  if (status === "unknown") return [];

  const meta = obj?.metadata ?? payload?.metadata ?? {};
  const plan: PlanId | undefined =
    meta?.plan === "buyout" || meta?.plan === "care" ? meta.plan : undefined;
  const identifier =
    obj?.acquiringOrderId ??
    obj?.subscriptionId ??
    obj?.orderId ??
    obj?.paymentId ??
    obj?.id;
  if (!identifier) return [];

  return [
    {
      userId: meta?.userId || undefined,
      customerId: String(obj?.buyerEmail ?? obj?.customerId ?? ""),
      subscriptionId: String(identifier),
      status,
      plan,
      email: obj?.buyerEmail ?? undefined,
      eventType: type,
      eventId: String(payload?.notifyId ?? obj?.acquiringOrderId ?? identifier),
      orderId: obj?.acquiringOrderId ? String(obj.acquiringOrderId) : undefined,
      grantsAccess: status === "active",
      amount: toMajor(obj?.amount, obj?.currency),
      currency: obj?.currency ?? undefined,
    },
  ];
}

// ── Provider ──────────────────────────────────────────────────────────────

export const waffoProvider: PaymentProvider = {
  name: "waffo",
  label: "Waffo",

  async createCheckout(p: CheckoutParams): Promise<CheckoutResult> {
    return isPancake()
      ? createCheckoutPancake(p)
      : createCheckoutAcquiring(p);
  },

  async verifyWebhook(
    rawBody: string,
    headers: Record<string, string | undefined>,
  ): Promise<NormalizedSubEvent[]> {
    return isPancake()
      ? normalizePancakeEvent(verifyPancakeWebhook(rawBody, headers))
      : normalizeAcquiringEvent(verifyAcquiringWebhook(rawBody, headers));
  },
};

/** Exposed for the config self-check and tests. */
export function waffoConfigSummary() {
  const pancake = isPancake();
  const missing: string[] = [];
  if (pancake) {
    const signed = !!env.waffoMerchantId() && !!env.waffoPrivateKey();
    if (!signed && !env.waffoStoreSlug()) {
      missing.push("WAFFO_STORE_SLUG or (WAFFO_MERCHANT_ID + WAFFO_PRIVATE_KEY)");
    }
    if (!env.waffoWebhookPublicKeyTest() && !env.waffoWebhookPublicKey())
      missing.push("WAFFO_WEBHOOK_PUBLIC_KEY_TEST");
    if (!env.waffoWebhookPublicKeyProd() && !env.waffoWebhookPublicKey())
      missing.push("WAFFO_WEBHOOK_PUBLIC_KEY_PROD");
  } else {
    if (!env.waffoWebhookPublicKey()) missing.push("WAFFO_WEBHOOK_PUBLIC_KEY");
    missing.push("Acquiring create-order payload (see docs/waffo.md)");
  }
  if (!priceForPlan("buyout")) missing.push("WAFFO_PRICE_ID_BUYOUT");
  if (!priceForPlan("care")) missing.push("WAFFO_PRICE_ID_CARE");
  return {
    flavor: pancake ? "pancake" : "acquiring",
    environment: pancake ? env.waffoEnvironment() : "n/a",
    auth: pancake
      ? env.waffoMerchantId() && env.waffoPrivateKey()
        ? "api-key (RSA signed)"
        : "store-slug"
      : "acquiring key",
    apiBase: env.waffoApiBase(),
    checkoutPath: env.waffoCheckoutPath(),
    webhookUrl: "/api/webhook",
    priceIdsConfigured: {
      buyout: !!priceForPlan("buyout"),
      care: !!priceForPlan("care"),
    },
    missing,
    ready: missing.length === 0,
  };
}

// Legacy HMAC secrets are intentionally NOT accepted as webhook credentials:
// both Waffo products use RSA signatures. `WAFFO_WEBHOOK_SECRET` is kept only
// for backward-compatible env files and has no effect on verification.
