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
};

export function PricingCards({ plans }: { plans: Plan[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const { t } = useLanguage();

  async function checkout(plan: Plan) {
    if (!plan.priceId) return;
    setBusyId(plan.id);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: plan.id }),
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

  return (
    <div className="grid items-start gap-4 sm:gap-5 lg:grid-cols-3">
      {plans.map((plan) => (
        <div
          key={plan.id}
          className={`card flex flex-col ${
            plan.highlight
              ? "relative border-accent ring-1 ring-accent/30"
              : plan.muted
                ? "border-line opacity-90"
                : "border-line"
          }`}
        >
          {plan.highlight && (
            <span className="absolute -top-px left-6 -translate-y-1/2 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-bg">
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
            {plan.launch && (
              <span className="rounded-full border border-accent/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-accent">
                {t("pricing.launch")}
              </span>
            )}
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
          <div className="mt-6">
            {plan.priceId ? (
              <button
                className="btn-solid w-full"
                data-cta={`pricing-${plan.id}`}
                onClick={() => checkout(plan)}
                disabled={busyId === plan.id}
              >
                {busyId === plan.id ? t("login.sending") : t(plan.ctaKey)}
              </button>
            ) : (
              <Link href="/login" className="btn-solid w-full" data-cta={`pricing-${plan.id}`}>
                {t(plan.ctaKey)}
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
