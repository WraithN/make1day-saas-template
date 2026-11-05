"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";

const KEY = "sk_cookie_consent";

export function CookieConsent() {
  const { t } = useLanguage();
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* ignore */
    }
  }, []);

  function decide(v: "accepted" | "declined") {
    try {
      localStorage.setItem(KEY, v);
    } catch {
      /* ignore */
    }
    if (v === "accepted") {
      // Let consent-gated scripts (GA, first-party analytics) load.
      window.dispatchEvent(new Event("sk-consent-accepted"));
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* Solid surface (no backdrop-blur) keeps the small print crisp. */}
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-line bg-surface p-4 text-sm text-ink-soft shadow-2xl sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-semibold text-ink">{t("cookie.title")}</span>{" "}
          {t("cookie.body")}{" "}
          <Link href="/privacy" className="text-accent hover:underline">
            {t("cookie.more")}
          </Link>
        </p>
        <div className="flex w-full shrink-0 gap-2 sm:w-auto">
          <button
            className="btn-ghost flex-1 sm:flex-none"
            onClick={() => decide("declined")}
          >
            {t("cookie.decline")}
          </button>
          <button
            className="btn-solid flex-1 sm:flex-none"
            onClick={() => decide("accepted")}
          >
            {t("cookie.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
