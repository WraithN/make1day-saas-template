"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// First-party pageview tracker. Sends an aggregate (path-only, no PII) hit to
// /api/track — but only after the visitor has accepted cookies, so it matches
// the consent banner's promise. The /admin page reads the resulting counts.
export function PageviewTracker() {
  const pathname = usePathname();
  const sent = useRef<string | null>(null);

  useEffect(() => {
    if (localStorage.getItem("sk_cookie_consent") !== "accepted") return;
    if (sent.current === pathname) return;
    sent.current = pathname;
    fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  // Re-evaluate when consent is granted mid-session.
  useEffect(() => {
    const onAccept = () => {
      sent.current = null;
      const p = window.location.pathname;
      fetch("/api/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: p }),
        keepalive: true,
      }).catch(() => {});
    };
    window.addEventListener("sk-consent-accepted", onAccept);
    return () => window.removeEventListener("sk-consent-accepted", onAccept);
  }, []);

  return null;
}
