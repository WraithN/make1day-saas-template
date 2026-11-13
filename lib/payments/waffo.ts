import {
  createHash,
  createVerify,
  randomUUID,
  sign as rsaSign,
} from "node:crypto";
import { env, priceForPlan, priceForPlanBf, waffoAcquiringMissing } from "@/lib/env";
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
//       checkout: POST /api/v1/order/create implemented via WAFFO_ACQUIRING_*
//                env contract fields. The signing string and response shape
//                are NOT specified by public docs, so they are configurable /
//                best-effort and flagged 需按你的 Waffo 合同核对 (§5).
//
// Everything downstream consumes NormalizedSubEvent, so the rest of the app
// (subscriptions, licenses, dashboard) stays protocol-agnostic.
// ───────────────────────────────────────────────────────────────

export function isOneTimePlan(plan: PlanId): boolean {
  return plan === "buyout" || plan === "pro" || plan === "founder";
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
  const pkg = p.buyoutPackage;
  const productId = p.blackFriday
    ? priceForPlanBf(p.plan, pkg) ?? priceForPlan(p.plan, pkg)
    : priceForPlan(p.plan, pkg);
  if (!productId) {
    throw new Error(
      `No Waffo Pancake product configured for plan "${p.plan}". Set WAFFO_PRICE_ID_BUYOUT / WAFFO_PRICE_ID_CARE / WAFFO_PRICE_ID_FOUNDER.`,
    );
  }

  const oneTime = isOneTimePlan(p.plan);
  const body: Record<string, unknown> = {
    productId,
    productType: oneTime ? "onetime" : "subscription",
    currency: "USD",
    metadata: {
      plan: oneTime ? "buyout" : "care",
      ...(oneTime && p.buyoutPackage ? { pkg: p.buyoutPackage } : {}),
      userId: p.userId ?? "",
      source: "make1day",
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

// ── Acquiring: create-order request signing (configurable) ────────────────

/**
 * RSA-SHA256 request signing for Acquiring, reusing Pancake's signing idea.
 *
 * The public Waffo docs do NOT specify Acquiring's canonical signing string,
 * so `WAFFO_ACQUIRING_SIGN_MODE` selects one instead of pretending to know:
 *   "pancake" (default) → METHOD\nPATH\nTS\nBASE64(SHA256(BODY))
 *   "raw"               → the raw request body
 * Both are 需按你的 Waffo 合同核对 (docs/waffo.md §5). The private key is the
 * same PEM used by Pancake signed auth (WAFFO_PRIVATE_KEY); Waffo's public key
 * verifies webhooks, the merchant's private key signs requests.
 */
function acquiringSignedHeaders(
  method: string,
  reqPath: string,
  bodyStr: string,
): Record<string, string> {
  const privateKey = env.waffoPrivateKey();
  const merchantId = env.waffoMerchantId();
  if (!privateKey) {
    throw new Error(
      "Waffo Acquiring request signing requires WAFFO_PRIVATE_KEY (PEM, use \\n escapes for a single-line env). See docs/waffo.md §5.",
    );
  }
  const mode = env.waffoAcquiringSignMode();
  const ts = Math.floor(Date.now() / 1000).toString();
  let canonical: string;
  if (mode === "raw") {
    canonical = bodyStr;
  } else {
    // "pancake" (default): the only canonical we actually have code for.
    const bodyHash = createHash("sha256").update(bodyStr).digest("base64");
    canonical = `${method}\n${reqPath}\n${ts}\n${bodyHash}`;
  }
  const signature = rsaSign(
    "sha256",
    Buffer.from(canonical),
    privateKey,
  ).toString("base64");

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "X-Timestamp": ts,
    "X-Signature": signature,
  };
  if (merchantId) headers["X-Merchant-Id"] = merchantId;
  return headers;
}

/**
 * Waffo Acquiring create-order (POST /api/v1/order/create).
 *
 * Every merchant-contract field comes from a WAFFO_ACQUIRING_* env var — none
 * are invented here (a missing one throws a named error from lib/env.ts). The
 * remaining fields are runtime values: ids are random + traceable, notifyUrl
 * is this site's single webhook, orderRequestedAt is "now".
 *
 * Field list / signing string / response shape are 需按你的 Waffo 合同核对 —
 * see docs/waffo.md §5. This is a best-effort implementation against the
 * public field list, NOT a verified end-to-end integration.
 */
async function createCheckoutAcquiring(
  p: CheckoutParams,
): Promise<CheckoutResult> {
  // Random + traceable: the ids carry plan/userId so ops can match a Waffo
  // order back to a make1day.dev checkout without inventing contract values.
  const trace = `${p.plan}.${p.userId ?? "anon"}`;
  const merchantOrderId = `SK-${trace}-${randomUUID()}`;
  const paymentRequestId = randomUUID();

  const body: Record<string, unknown> = {
    merchantInfo: env.waffoAcquiringMerchantInfo(),
    merchantOrderId,
    notifyUrl: `${env.siteUrl().replace(/\/+$/, "")}/api/webhook`,
    orderCurrency: env.waffoAcquiringCurrency(),
    orderDescription: env.waffoAcquiringOrderDescription(),
    orderRequestedAt: new Date().toISOString(),
    paymentInfo: env.waffoAcquiringPaymentInfo(),
    paymentRequestId,
    userInfo: env.waffoAcquiringUserInfo(),
  };

  const reqPath = env.waffoCheckoutPath();
  const bodyStr = JSON.stringify(body);
  const headers = acquiringSignedHeaders("POST", reqPath, bodyStr);

  const res = await fetch(`${env.waffoApiBase()}${reqPath}`, {
    method: "POST",
    headers,
    body: bodyStr,
    signal: AbortSignal.timeout(20_000),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.message ?? json?.error ?? json?.msg ?? res.statusText;
    throw new Error(
      `Waffo Acquiring create-order failed (${res.status}): ${msg}`,
    );
  }

  // docs/waffo.md describes data.orderAction as a JSON string carrying
  // webUrl / deeplinkUrl. The exact wrapper is 需按你的 Waffo 合同核对, so we
  // accept a few plausible shapes and never crash on an unknown one.
  let action: any = json?.data?.orderAction ?? json?.orderAction ?? json?.data;
  if (typeof action === "string") {
    try {
      action = JSON.parse(action);
    } catch {
      action = {};
    }
  }
  const url =
    action?.webUrl ??
    action?.deeplinkUrl ??
    json?.data?.checkoutUrl ??
    json?.checkoutUrl ??
    json?.url;
  if (url) return { url: String(url) };

  // No hosted URL: return the order id. NOTE /api/checkout currently only
  // redirects on url/approvalUrl, so an id-only response needs the redirect
  // step wired up for your contract — documented in docs/waffo.md §5.
  const orderId =
    json?.data?.orderId ??
    json?.data?.acquiringOrderId ??
    json?.orderId ??
    merchantOrderId;
  return { orderId: String(orderId) };
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
  const buyoutPackage =
    plan === "buyout" && (meta?.pkg === "studio" || meta?.pkg === "core")
      ? (meta.pkg as "core" | "studio")
      : undefined;

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
      buyoutPackage,
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

  /**
   * Waffo Pancake Customer Portal SSO: mint a short-lived portal session
   * (POST /v1/actions/auth/issue-session-token with purpose:"portal") and
   * send the browser to portalUrl + "#token=…". This is the ONLINE
   * self-service cancellation flow Waffo's merchant review requires
   * ("not just email"): the portal lets the customer cancel or reactivate
   * their subscription without us. Acquiring has no documented portal.
   * Requires WAFFO_STORE_ID + WAFFO_MERCHANT_ID + WAFFO_PRIVATE_KEY; the
   * buyerIdentity MUST equal the email passed at checkout.
   */
  async createPortalSession(p: PortalParams): Promise<PortalResult | null> {
    if (!isPancake()) return null;
    const storeId = env.waffoStoreId();
    const buyerIdentity = (p.buyerEmail || "").trim() || p.customerId;
    if (!storeId || !buyerIdentity) return null;
    const reqPath = "/v1/actions/auth/issue-session-token";
    const body = JSON.stringify({
      storeId,
      buyerIdentity,
      purpose: "portal",
    });
    const res = await fetch(`${env.waffoApiBase()}${reqPath}`, {
      method: "POST",
      headers: pancakeSignedHeaders("POST", reqPath, body),
      body,
      signal: AbortSignal.timeout(9000),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`waffo_portal_http_${res.status}: ${text.slice(0, 200)}`);
    }
    let json: { data?: { portalUrl?: string; token?: string } };
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`waffo_portal_bad_json: ${text.slice(0, 120)}`);
    }
    const portalUrl = json?.data?.portalUrl;
    const token = json?.data?.token;
    if (!portalUrl || !token) return null;
    // Bearer credential in the fragment: mint-on-click, never logged.
    return { url: `${portalUrl}#token=${token}` };
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
    // Acquiring create-order is implemented; it needs the full env contract
    // (JSON blobs + signing key + webhook key). List each missing var by name.
    for (const name of waffoAcquiringMissing()) missing.push(name);
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
      : env.waffoPrivateKey()
        ? "RSA signed (WAFFO_PRIVATE_KEY)"
        : "missing WAFFO_PRIVATE_KEY",
    signMode: pancake ? "n/a" : env.waffoAcquiringSignMode(),
    apiBase: env.waffoApiBase(),
    checkoutPath: env.waffoCheckoutPath(),
    webhookUrl: "/api/webhook",
    priceIdsConfigured: {
      buyout: !!priceForPlan("buyout"),
      care: !!priceForPlan("care"),
      // Optional launch slot — presence only, never a missing-var blocker.
      founder: !!priceForPlan("founder"),
    },
    missing,
    ready: missing.length === 0,
  };
}

// Legacy HMAC secrets are intentionally NOT accepted as webhook credentials:
// both Waffo products use RSA signatures. `WAFFO_WEBHOOK_SECRET` is kept only
// for backward-compatible env files and has no effect on verification.
