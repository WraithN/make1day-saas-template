// Shared contract for every payment gateway make1day.dev supports.
// Each provider normalises its own webhook payload into NormalizedSubEvent so
// the rest of the app (DB upsert, dashboard) stays provider-agnostic.

/**
 * Plans sold on /pricing: "buyout" is one-time, "care" is monthly.
 * "pro" / "scale" are the legacy price-slot names kept for compatibility.
 */
export type PlanId = "buyout" | "care" | "pro" | "scale";

export type NormalizedStatus =
  | "active"
  | "trialing"
  | "canceled"
  | "past_due"
  | "incomplete"
  | "unknown";

export type NormalizedSubEvent = {
  userId?: string; // from client_reference_id / metadata, if present
  customerId: string; // gateway customer id
  subscriptionId: string; // gateway subscription id
  status: NormalizedStatus;
  plan?: PlanId;
  periodEnd?: string | null; // ISO timestamp
  // ── Extra fields used for license issuance / idempotency ─────
  email?: string; // buyer email (Pancake: data.buyerEmail)
  eventType?: string; // raw gateway event name
  eventId?: string; // stable event id for deduplication
  orderId?: string; // gateway order id
  /** True when this event should create/refresh a download license. */
  grantsAccess?: boolean;
  // ── Order metadata (provider-agnostic) ─────
  /** Minor-unit amount as reported by the gateway (e.g. 4900 cents). Convert
   *  with `toMajor()` before displaying. Absent when the gateway omits it. */
  amount?: number;
  /** ISO currency code, e.g. "usd", "eur". */
  currency?: string;
};

// Currencies that have no minor unit (so the gateway amount is already whole).
const ZERO_DECIMAL_CURRENCIES = new Set([
  "JPY", "KRW", "CLP", "VND", "BIF", "XAF", "XOF", "PYG", "RWF", "UGX",
  "VUV", "GNF", "KMF", "DJF", "XPF",
]);

/** Convert a gateway minor-unit amount to major units for display. */
export function toMajor(minor?: number, currency?: string): number | undefined {
  if (minor == null || Number.isNaN(minor)) return undefined;
  if (ZERO_DECIMAL_CURRENCIES.has((currency ?? "").toUpperCase())) return minor;
  return minor / 100;
}

export type CheckoutResult = {
  // Hosted checkout URL to redirect the browser to (Stripe / Creem / Waffo).
  url?: string;
  // PayPal uses an order/subscription id + an approval link instead.
  orderId?: string;
  approvalUrl?: string;
};

export type CheckoutParams = {
  plan: PlanId;
  customerEmail?: string;
  userId?: string;
  successUrl: string;
  cancelUrl: string;
  /**
   * When true, resolve the Black Friday promo price (priceForPlanBf) instead
   * of the standard price. Only the /black-friday page starts a BF checkout;
   * /pricing never passes this, so its prices stay untouched.
   */
  blackFriday?: boolean;
};

export interface PaymentProvider {
  /** Stable identifier, also stored on the subscription row. */
  readonly name: string;
  /** Human-readable label for the UI. */
  readonly label: string;
  /** Create a hosted checkout / subscription and return where to redirect. */
  createCheckout(p: CheckoutParams): Promise<CheckoutResult>;
  /**
   * Verify the raw webhook body + headers and return normalised events.
   * THROW when the signature is missing/invalid or the body cannot be parsed —
   * the caller turns that into HTTP 400. Return [] ONLY for a valid, verified
   * event that needs no provisioning (caller acknowledges with HTTP 200).
   */
  verifyWebhook(
    rawBody: string,
    headers: Record<string, string | undefined>,
  ): Promise<NormalizedSubEvent[]>;
  /**
   * Create a customer-facing billing portal session (update card, cancel,
   * view invoices). Optional — providers without a self-serve portal (e.g.
   * PayPal, Waffo Pancake) return null, and the UI falls back to a managed
   * "contact support" path. Implemented for Stripe (real) and Creem.
   */
  createPortalSession?(p: PortalParams): Promise<PortalResult | null>;
}

export type PortalParams = {
  customerId: string;
  returnUrl: string;
  /** Signed-in user's email. Waffo Pancake has no customer ids: its portal
   *  SSO signs the customer in by the SAME buyerIdentity used at checkout. */
  buyerEmail?: string;
};

export type PortalResult = {
  /** Hosted billing portal URL to redirect the browser to. */
  url: string;
};
