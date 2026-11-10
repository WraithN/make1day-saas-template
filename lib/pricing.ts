// Single source of truth for make1day's displayed and chargeable prices.
// Pages, JSON-LD, llms.txt/llms-full.txt and the Black Friday page all read
// from here so a reprice can never leave two surfaces disagreeing.
//
// Ladder semantics:
//   list    — struck-through anchor ("was") price, display only
//   regular — default sale price outside campaign windows
//   mgm     — share-to-unlock price (member-get-member)
//   bf      — Black Friday window price (env-gated, see env.blackFridayActive)
//
// 2026-11-10 reprice: positioned just below the mainstream paid-kit band
// (ShipFast $199-249, supastarter $299, MakerKit $349) instead of the $99
// launch price, which the 2026-11 competitor refresh showed to be in the
// crowded low band (Agentic $99, ShipKit.sh $99, MkSaaS $129).

import { env } from "@/lib/env";

export interface PriceLadder {
  list: number;
  regular: number;
  mgm: number;
  bf: number;
}

export const PRICES: { buyout: PriceLadder; care: PriceLadder } = {
  // regular sits just below the mainstream paid-kit band (ShipFast $199-249,
  // supastarter $299, MakerKit $349); bf = 30% off regular (七折) during the
  // Black Friday window; list = struck anchor; mgm = share-to-unlock.
  buyout: { list: 349, regular: 249, mgm: 219, bf: 174 },
  // Care includes the monthly video-studio credits for the generated-module
  // buyers who run their own video site (see docs/video-product.md).
  care: { list: 29, regular: 19, mgm: 15, bf: 13 },
};

export type PricePlan = keyof typeof PRICES;

export function bfActive(): boolean {
  return env.blackFridayActive();
}

/** What a buy button charges right now: BF window price, else regular. */
export function effectivePrice(plan: PricePlan): number {
  const ladder = PRICES[plan];
  return bfActive() ? ladder.bf : ladder.regular;
}

/** "$249" / "$19" style strings for copy and structured data. */
export function priceTag(plan: PricePlan): string {
  return `$${effectivePrice(plan)}`;
}
