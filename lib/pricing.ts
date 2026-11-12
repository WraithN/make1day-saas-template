// Single source of truth for make1day.dev's displayed and chargeable prices.
// Pages, JSON-LD, llms.txt/llms-full.txt and the Black Friday page all read
// from here so a reprice can never leave two surfaces disagreeing.
//
// Ladder semantics:
//   list    — struck-through anchor ("was") price, display only
//   regular — default sale price outside campaign windows
//   bf      — Black Friday window price = 30% off regular (env-gated)
//
// Positioning rationale (which competing kits this sits below, and why) lives
// in docs/competitive-analysis.md — competitor names must never appear in
// shipped source files (the white-label sweep asserts it).

import { env } from "@/lib/env";

export interface PriceLadder {
  list: number;
  regular: number;
  bf: number;
}

export const PRICES: { buyout: PriceLadder; care: PriceLadder } = {
  // regular sits just below the mainstream paid-kit band; bf = 30% off
  // regular (七折) during the Black Friday window; list = struck anchor.
  // Competitor rationale: docs/competitive-analysis.md
  // (competitor names must never appear in shipped source — white-label sweep).
  buyout: { list: 349, regular: 249, bf: 174 },
  // Care includes the Video Studio source module; generated-project owners
  // run their own video site with their own provider keys (docs/video-product.md).
  care: { list: 29, regular: 19, bf: 13 },
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
