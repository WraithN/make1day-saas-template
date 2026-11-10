"use client";

import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n";

export type Plan = {
  id: string;
  name: string;
  price: string;
  /** Struck-through list price, shown next to a launch price. */
  originalPrice?: string;
  /** Show the "launch price" badge. */
  launch?: boolean;
  period: string;
  forever?: boolean;
  once?: boolean;
  monthly?: boolean;
  features: string[]; // dict keys, translated with t() below
  priceId: string | null; // resolved for the active provider (server-side)
  ctaKey: string;
  /** Restrained emphasis (e.g. the Buyout plan). No neon glow. */
  highlight?: boolean;
  /** De-emphasise a plan (e.g. the Free plan) as a quiet entry point. */
  muted?: boolean;
  /** Small accent caption under the feature list (e.g. what Care actually sells). */
  note?: string;
  /** Black Friday badge — shows the BLACK FRIDAY tag instead of "launch price". */
  bf?: boolean;
  /** Where the CTA links when there is no priceId (defaults to /login). The
   *  Black Friday page overrides this to /pricing so an unconfigured promo
   *  still sends buyers to the real purchase page. */
  ctaFallbackHref?: string;
};

// Inline spinner so a clicked checkout button shows immediate feedback while
// the (sometimes slow) redirect to the payment provider resolves.
function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

export function PricingCards({
  plans,
  paymentsReady = true,
}: {
  plans: Plan[];
  /** False while the payment provider is unconfigured (e.g. pending
   *  approval): paid CTAs render as a disabled "coming soon" button. */
  paymentsReady?: boolean;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const { t } = useLanguage();

  async function checkout(plan: Plan) {
    if (!plan.priceId) return;
    setBusyId(plan.id);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: plan.id, blackFriday: plan.bf }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      alert(data.error || "Checkout failed");
    } catch {
      alert("Network error");
    } finally {
      setBusyId(null);
    }
  }

  // Highlighter blocks rotate through the hand-drawn palette. These classes
  // are site-only; a generated project (which ships its own globals.css)
  // simply falls back to plain white cards.
  const tones = ["", "card-yellow", "card-mint"];

  return (
    <>
    <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
      {plans.map((plan, idx) => (
        <div
          key={plan.id}
          className={`card flex h-full flex-col ${tones[idx % tones.length] ?? ""} ${
            plan.highlight
              ? "relative border-accent ring-1 ring-accent/30"
              : plan.muted
                ? "border-line opacity-90"
                : "border-line"
          }`}
        >
          {plan.highlight && (
            <span className="absolute -top-px left-6 -translate-y-1/2 rounded-md border-2 border-ink bg-accent px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white">
              {t("pricing.popular")}
            </span>
          )}
          <div className="flex items-center justify-between">
            <h3
              className={`text-lg font-semibold ${
                plan.muted ? "text-ink-soft" : "text-ink"
              }`}
            >
              {plan.name}
            </h3>
            {plan.bf ? (
              <span className="rounded-full border border-accent/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-accent">
                {t("blackfriday.badge")}
              </span>
            ) : plan.launch ? (
              <span className="rounded-full border border-accent/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-accent">
                {t("pricing.launch")}
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span
              className={`text-3xl font-bold ${
                plan.muted ? "text-ink-soft" : "text-ink"
              }`}
            >
              {plan.price}
            </span>
            <span className="text-sm text-muted">
              {plan.forever
                ? t("pricing.forever")
                : plan.once
                  ? t("pricing.buyout.once")
                  : plan.monthly
                    ? t("pricing.month")
                    : plan.period}
            </span>
            {plan.originalPrice && (
              <s className="text-sm text-muted">{plan.originalPrice}</s>
            )}
            {plan.bf && plan.originalPrice && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
                {t("pricing.off30")}
              </span>
            )}
          </div>
          <ul className="mt-5 flex-1 space-y-2 text-sm text-ink-soft">
            {plan.features.map((f) => (
              <li key={f}>· {t(f)}</li>
            ))}
          </ul>
          {plan.note && (
            <p className="mt-4 border-t border-line pt-3 text-[12px] leading-relaxed text-accent">
              {t(plan.note)}
            </p>
          )}
          {/* mt-auto pins every CTA to the same baseline across the three
              equal-height cards, regardless of feature-list length. */}
          <div className="mt-auto pt-6">
            {!paymentsReady && (plan.once || plan.monthly) ? (
              <button
                className="btn-solid w-full cursor-not-allowed opacity-60"
                data-cta={`pricing-${plan.id}-soon`}
                disabled
              >
                {t("pricing.comingSoon")}
              </button>
            ) : plan.priceId ? (
              <button
                className="btn-solid w-full"
                data-cta={`pricing-${plan.id}`}
                onClick={() => checkout(plan)}
                disabled={busyId === plan.id}
                aria-busy={busyId === plan.id}
              >
                {busyId === plan.id ? (
                  <>
                    <Spinner />
                    {t("login.sending")}
                  </>
                ) : (
                  t(plan.ctaKey)
                )}
              </button>
            ) : (
              <Link
                href={plan.ctaFallbackHref ?? "/login"}
                className="btn-solid w-full"
                data-cta={`pricing-${plan.id}`}
              >
                {t(plan.ctaKey)}
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
    {!paymentsReady && (
      <p className="mt-5 text-center text-[13px] text-muted">
        {t("pricing.comingSoonNote")}
      </p>
    )}
    </>
  );
}
