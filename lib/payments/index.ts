import { env } from "@/lib/env";
import type { PaymentProvider } from "./types";
import { stripeProvider } from "./stripe";
import { creemProvider } from "./creem";
import { paypalProvider } from "./paypal";
import { waffoProvider } from "./waffo";

let _provider: PaymentProvider | null = null;

/** Return the active payment provider based on PAYMENT_PROVIDER. */
export function getPaymentProvider(): PaymentProvider {
  if (_provider) return _provider;
  switch (env.paymentProvider()) {
    case "creem":
      _provider = creemProvider;
      break;
    case "paypal":
      _provider = paypalProvider;
      break;
    case "waffo":
      _provider = waffoProvider;
      break;
    case "stripe":
    default:
      _provider = stripeProvider;
      break;
  }
  return _provider!;
}

/** Label of the active provider, for UI copy. */
export function paymentProviderLabel(): string {
  return getPaymentProvider().label;
}

/** Map a stored provider name to a display label. */
const PROVIDER_LABELS: Record<string, string> = {
  stripe: "Stripe",
  creem: "Creem",
  paypal: "PayPal",
  waffo: "Waffo",
};
export function providerLabel(name: string): string {
  return PROVIDER_LABELS[name] ?? name;
}

export type { PaymentProvider } from "./types";
