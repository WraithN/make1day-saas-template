// Shared contract for every payment gateway ShipKit supports.
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
};

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
   * Returns [] when the signature is invalid (caller should 400).
   */
  verifyWebhook(
    rawBody: string,
    headers: Record<string, string | undefined>,
  ): Promise<NormalizedSubEvent[]>;
}
