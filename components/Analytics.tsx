"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Consent-gated Google Analytics (GA4). The gtag script is only injected after
// the visitor accepts cookies (we listen for the `sk-consent-accepted` event
// the CookieConsent banner dispatches, and also load immediately if consent was
// already given). This keeps the site GDPR/CCPA-friendly: no tracking pixel is
// loaded until the user opts in.
//
// Set NEXT_PUBLIC_GA_ID to your GA4 Measurement ID to enable.
export function Analytics() {
  const pathname = usePathname();
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  useEffect(() => {
    if (!gaId) return;
    const load = () => {
      if (document.getElementById("sk-ga")) return;
      const s = document.createElement("script");
      s.async = true;
      s.id = "sk-ga";
      s.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(s);
      const w = window as unknown as {
        dataLayer?: unknown[];
        gtag?: (...a: unknown[]) => void;
      };
      w.dataLayer = w.dataLayer || [];
      w.gtag = function () {
        w.dataLayer?.push(arguments);
      };
      w.gtag("js", new Date());
      w.gtag("config", gaId, { anonymize_ip: true });
    };

    if (localStorage.getItem("sk_cookie_consent") === "accepted") load();

    const onAccept = () => load();
    window.addEventListener("sk-consent-accepted", onAccept);
    return () => window.removeEventListener("sk-consent-accepted", onAccept);
  }, [gaId]);

  // Report virtual pageviews on client-side route changes (after GA loaded).
  useEffect(() => {
    if (!gaId) return;
    const w = window as unknown as { gtag?: (...a: unknown[]) => void };
    if (w.gtag) w.gtag("event", "page_view", { page_path: pathname });
  }, [pathname, gaId]);

  return null;
}
