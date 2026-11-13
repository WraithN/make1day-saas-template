"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n";

/**
 * $1 founder window — a horizontal strip under the plan grid, not a fifth
 * card (the grid is tuned for 4). Renders NOTHING unless the operator has
 * configured the dedicated Waffo product (WAFFO_PRICE_ID_FOUNDER), so hiding
 * the offer later is an env edit, never a code change. The checkout call is
 * plan "founder"; the gateway metadata still says buyout/core, so entitlement
 * semantics are unchanged.
 */
export function FounderCard({
  priceId,
  paymentsReady,
  price,
  wasPrice,
}: {
  priceId: string | null;
  paymentsReady: boolean;
  price: string;
  wasPrice: string;
}) {
  const [busy, setBusy] = useState(false);
  const { t } = useLanguage();

  if (!priceId || !paymentsReady) return null;

  async function buy() {
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: "founder" }),
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
      setBusy(false);
    }
  }

  return (
    <div className="card mt-6 flex flex-col gap-5 border-line sm:mt-8 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-ink">
            {t("pricing.founder.name")}
          </h3>
          <span className="rounded-full border border-accent/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-accent">
            {t("pricing.launch")}
          </span>
        </div>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
          {t("pricing.founder.body")}
        </p>
        <p className="mt-2 max-w-xl text-[12px] leading-relaxed text-accent">
          {t("pricing.founder.note")}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-5">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-ink">{price}</span>
          <s className="text-sm text-muted">{wasPrice}</s>
        </div>
        <button
          className="btn-solid whitespace-nowrap"
          onClick={buy}
          disabled={busy}
          aria-busy={busy}
          data-cta="pricing-founder"
        >
          {busy ? t("login.sending") : t("pricing.buyLicense")}
        </button>
      </div>
    </div>
  );
}
