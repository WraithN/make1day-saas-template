import { env } from "@/lib/env";
import type { PaymentProvider } from "./types";
import { stripeProvider } from "./stripe";
import { creemProvider } from "./creem";
import { paypalProvider } from "./paypal";
import { waffoProvider } from "./waffo";
import { lemonsqueezyProvider } from "./lemonsqueezy";

const ALL: Record<string, PaymentProvider> = {
  stripe: stripeProvider,
  creem: creemProvider,
  paypal: paypalProvider,
  waffo: waffoProvider,
  lemonsqueezy: lemonsqueezyProvider,
};

let _providers: PaymentProvider[] | null = null;

/**
 * All payment providers enabled via PAYMENT_PROVIDER (comma-separated).
 * A single value is the common case; a generated project may list several.
 */
export function getPaymentProviders(): PaymentProvider[] {
  if (_providers) return _providers;
  const names = env
    .paymentProvider()
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const list = names
    .map((n) => ALL[n])
    .filter((p): p is PaymentProvider => Boolean(p));
  _providers = list;
  return _providers;
}

/** The primary (first) payment provider used for checkout. */
export function getPaymentProvider(): PaymentProvider {
  const list = getPaymentProviders();
  return list[0];
}

/** Label of the primary provider, for UI copy. */
export function paymentProviderLabel(): string {
  return getPaymentProvider().label;
}

/** Map a stored provider name to a display label. */
const PROVIDER_LABELS: Record<string, string> = {
  stripe: "Stripe",
  creem: "Creem",
  paypal: "PayPal",
  waffo: "Waffo",
  lemonsqueezy: "Lemon Squeezy",
};
export function providerLabel(name: string): string {
  return PROVIDER_LABELS[name] ?? name;
}

export type { PaymentProvider } from "./types";
