"use client";

import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n";

// Black-Friday-only pricing ladder: every paid plan shows three price points —
// the struck list price (原价), the share-to-unlock MGM price (MGM 传播价), and
// the lowest Black Friday price (黑五价) that the buy button actually charges.
// Site-only (not shipped to generated customer builds).

export type BfPlan = {
  id: string;
  name: string;
  originalPrice: string; // struck anchor, e.g. "$349"
  mgmPrice: string; // "$219"
  bfPrice: string; // "$189" — what the CTA charges
  once?: boolean;
  monthly?: boolean;
  forever?: boolean;
  features: string[]; // dict keys, rendered with t()
  priceId: string | null; // BF price id for the active provider
  ctaFallbackHref: string;
  note?: string; // dict key
};

const MGM_UNLOCK_KEY = "bf_mgm_unlocked";

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

const SHARE_TARGETS: { key: string; href: (url: string, text: string) => string }[] = [
  {
    key: "x",
    href: (url, text) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    key: "linkedin",
    href: (url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    key: "facebook",
    href: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
];

export function BlackFridayPlans({
  plans,
  shareUrl,
  shareText,
  paymentsReady = true,
}: {
  plans: BfPlan[];
  shareUrl: string;
  shareText: string;
  /** False while the payment provider is unconfigured (e.g. pending
   *  approval): paid CTAs render as a disabled "coming soon" button. */
  paymentsReady?: boolean;
}) {
  const { t } = useLanguage();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [copied, setCopied] = useState(false);

  async function checkout(plan: BfPlan) {
    if (!plan.priceId) return;
    setBusyId(plan.id);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: plan.id, blackFriday: true }),
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

  function doShare(target: (url: string, text: string) => string) {
    if (typeof window !== "undefined") {
      window.open(target(shareUrl, shareText), "_blank", "noopener,noreferrer");
    }
    setUnlocked(true);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(MGM_UNLOCK_KEY, "1");
      } catch {
        /* ignore */
      }
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setUnlocked(true);
      try {
        window.localStorage.setItem(MGM_UNLOCK_KEY, "1");
      } catch {
        /* ignore */
      }
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setUnlocked(true);
    }
  }

  // Reveal the MGM tier if it was unlocked in a previous visit.
  if (typeof window !== "undefined" && !unlocked) {
    try {
      if (window.localStorage.getItem(MGM_UNLOCK_KEY) === "1") setUnlocked(true);
    } catch {
      /* ignore */
    }
  }

  const tones = ["", "card-yellow", "card-mint"];

  return (
    <div>
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
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
                <div
                  className={`flex items-center gap-2 rounded-md border px-2 py-1 text-sm ${
                    unlocked
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : "border-dashed border-line text-muted"
                  }`}
                >
                  <span className="font-semibold">
                    {t("blackfriday.tierMgm")}
                  </span>
                  <s className={unlocked ? "" : "opacity-60"}>{plan.mgmPrice}</s>
                  {unlocked ? (
                    <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      {t("blackfriday.unlocked")}
                    </span>
                  ) : (
                    <span className="ml-auto text-[11px]">
                      {t("blackfriday.shareUnlock")}
                    </span>
                  )}
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

      {/* Share-to-unlock MGM bar */}
      <div className="card mx-auto mt-6 max-w-3xl border-accent/40 sm:p-6">
        <div className="eyebrow mb-2">{t("blackfriday.shareHeading")}</div>
        <p className="text-sm text-ink-soft">{t("blackfriday.shareBody")}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {SHARE_TARGETS.map((s) => (
            <button
              key={s.key}
              type="button"
              className="btn-ghost"
              onClick={() => doShare(s.href)}
            >
              {t(`blackfriday.share.${s.key}`)}
            </button>
          ))}
          <button type="button" className="btn-ghost" onClick={copyLink}>
            {copied ? t("blackfriday.copied") : t("blackfriday.share.copy")}
          </button>
        </div>
        {unlocked && (
          <p className="mt-3 text-sm font-semibold text-accent">
            {t("blackfriday.unlockedBody")}
          </p>
        )}
      </div>
    </div>
  );
}
