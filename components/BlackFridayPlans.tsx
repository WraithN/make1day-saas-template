"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n";

// Black-Friday-only pricing ladder: every paid plan shows two price points —
// the struck list price (原价) and the lowest Black Friday price (黑五价) that
// the buy button actually charges.
// Site-only (not shipped to generated customer builds).

export type BfPlan = {
  id: string;
  name: string;
  originalPrice: string; // struck anchor, e.g. "$349"
  bfPrice: string; // "$174" — what the CTA charges
  once?: boolean;
  monthly?: boolean;
  forever?: boolean;
  features: string[]; // dict keys, rendered with t()
  priceId: string | null; // BF price id for the active provider
  ctaFallbackHref: string;
  note?: string; // dict key
};

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

export function BlackFridayPlans({
  plans,
  paymentsReady = true,
}: {
  plans: BfPlan[];
  /** False while the payment provider is unconfigured (e.g. pending
   *  approval): paid CTAs render as a disabled "coming soon" button. */
  paymentsReady?: boolean;
}) {
  const { t } = useLanguage();
  const [busyId, setBusyId] = useState<string | null>(null);
  // Hard in-flight guard: state updates are async, so a double-click inside
  // the same tick (or hammering after an error re-enables the button) could
  // mint several pending provider checkout sessions. The ref is synchronous.
  const inFlight = useRef(false);

  async function checkout(plan: BfPlan) {
    if (!plan.priceId) return;
    if (inFlight.current) return;
    inFlight.current = true;
    setBusyId(plan.id);
    let navigating = false;
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: plan.id, blackFriday: true }),
      });
      const data = await res.json();
      if (data.url) {
        // Navigating away: keep the guard locked so late clicks can't start
        // a second checkout while the browser leaves the page.
        navigating = true;
        window.location.href = data.url;
        return;
      }
      alert(data.error || "Checkout failed");
    } catch {
      alert("Network error");
    } finally {
      if (!navigating) {
        inFlight.current = false;
        setBusyId(null);
      }
    }
  }

  const tones = ["", "card-yellow", "card-mint"];

  return (
    <div>
      <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
        {plans.map((plan, idx) => (
          <div
            key={plan.id}
            className={`card flex h-full flex-col ${tones[idx % tones.length] ?? ""} ${
              plan.id === "buyout"
                ? "relative border-accent ring-1 ring-accent/30"
                : plan.id === "free"
                  ? "border-line opacity-90"
                  : "border-line"
            }`}
          >
            {plan.id === "buyout" && (
              <span className="absolute -top-px left-6 -translate-y-1/2 rounded-md border-2 border-ink bg-accent px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white">
                {t("pricing.popular")}
              </span>
            )}
            <div className="flex items-center justify-between">
              <h3
                className={`text-lg font-semibold ${
                  plan.id === "free" ? "text-ink-soft" : "text-ink"
                }`}
              >
                {plan.name}
              </h3>
              <span className="rounded-full border border-accent/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-accent">
                {t("blackfriday.badge")}
              </span>
            </div>

            {/* Three-tier price ladder */}
            {plan.id === "free" ? (
              <div className="mt-3">
                <span className="text-3xl font-bold text-ink">{plan.bfPrice}</span>
                <span className="ml-2 text-sm text-muted">
                  {t("pricing.forever")}
                </span>
              </div>
            ) : (
              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted">
                  <span>{t("blackfriday.tierOriginal")}</span>
                  <s>{plan.originalPrice}</s>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold text-accent">
                    {t("blackfriday.tierBf")}
                  </span>
                  <span className="text-3xl font-bold text-ink">{plan.bfPrice}</span>
                  <span className="text-sm text-muted">
                    {plan.once
                      ? t("pricing.buyout.once")
                      : plan.monthly
                        ? t("pricing.month")
                        : ""}
                  </span>
                </div>
              </div>
            )}

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

            <div className="mt-auto pt-6">
              {!paymentsReady && (plan.once || plan.monthly) ? (
                <button
                  className="btn-solid w-full cursor-not-allowed opacity-60"
                  data-cta={`bf-${plan.id}-soon`}
                  disabled
                >
                  {t("pricing.comingSoon")}
                </button>
              ) : plan.priceId ? (
                <button
                  className="btn-solid w-full"
                  data-cta={`bf-${plan.id}`}
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
                    t("blackfriday.cta")
                  )}
                </button>
              ) : (
                <Link
                  href={plan.ctaFallbackHref}
                  className="btn-solid w-full"
                  data-cta={`bf-${plan.id}`}
                >
                  {t("blackfriday.cta")}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
