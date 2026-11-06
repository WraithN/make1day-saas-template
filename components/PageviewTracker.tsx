"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// First-party traffic tracker. Sends events to /api/track — but only after
// the visitor has accepted cookies, so it matches the consent banner's
// promise.
//
// Three event types are reported:
//   view  — a page view
//   cta   — a click on any element carrying a data-cta="<label>" attribute
//   conversion — read from the ?converted=1 flag the account page sets after
//     a successful checkout
//
// The /admin page reads the resulting counts and builds the funnel.
export function PageviewTracker() {
  const pathname = usePathname();
  const sent = useRef<string | null>(null);

  function send(payload: {
    kind: "view" | "cta" | "conversion";
    path?: string;
    label?: string;
  }) {
    try {
      fetch("/api/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: payload.kind,
          path: payload.path ?? window.location.pathname,
          label: payload.label,
          referrer: document.referrer || undefined,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* analytics must never break the page */
    }
  }

  useEffect(() => {
    if (localStorage.getItem("sk_cookie_consent") !== "accepted") return;
    if (sent.current === pathname) return;
    sent.current = pathname;
    send({ kind: "view", path: pathname });
  }, [pathname]);

  // Re-evaluate when consent is granted mid-session.
  useEffect(() => {
    const onAccept = () => {
      sent.current = null;
      send({ kind: "view", path: window.location.pathname });
    };
    window.addEventListener("sk-consent-accepted", onAccept);
    return () => window.removeEventListener("sk-consent-accepted", onAccept);
  }, []);

  // CTA clicks: any element with data-cta="<label>" reports one event.
  useEffect(() => {
    if (localStorage.getItem("sk_cookie_consent") !== "accepted") return;

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const el = target?.closest?.("[data-cta]") as HTMLElement | null;
      if (!el) return;
      const label = el.getAttribute("data-cta");
      if (!label) return;
      send({ kind: "cta", path: el.getAttribute("data-cta-path") ?? window.location.pathname, label });
    };

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  // Conversion: the account page appends ?converted=1 after a paid checkout
  // returns. Report it once, then clean the URL so a refresh cannot double
  // count.
  useEffect(() => {
    if (localStorage.getItem("sk_cookie_consent") !== "accepted") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("converted") !== "1") return;
    send({ kind: "conversion", path: "/account", label: "purchase" });
    url.searchParams.delete("converted");
    window.history.replaceState({}, "", url.toString());
  }, []);

  return null;
}
