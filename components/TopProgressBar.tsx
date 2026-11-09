"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Thin top loading bar that appears during client-side route transitions.
 *
 * Without it, a <Link> click silently navigates and the page can look frozen
 * for a beat (especially the first visit to a route that hydrates a server
 * component) — making the UI feel "stuck". The bar gives instant, unmistakable
 * feedback that the click registered and something is happening.
 *
 * This Next build doesn't export `useNavigation`, so we detect the navigation
 * START by wrapping history.pushState/replaceState (which the App Router calls
 * on every <Link> click) plus `popstate`, and the navigation END when the
 * pathname actually changes (new route committed). Version-proof, no deps.
 */
export function TopProgressBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(8);
  const pending = useRef(false);

  // Detect navigation START.
  useEffect(() => {
    const begin = () => {
      pending.current = true;
      setVisible(true);
      setWidth(8);
      requestAnimationFrame(() => setWidth(90));
    };
    const urlChanged = (url?: string | URL | null) => {
      const next = url ? String(url) : window.location.href;
      // Ignore no-op history writes so we only show the bar for real nav.
      return next !== window.location.href;
    };

    const origPush = window.history.pushState as (...a: any[]) => void;
    const origReplace = window.history.replaceState as (...a: any[]) => void;
    window.history.pushState = function (...args: unknown[]) {
      if (urlChanged(args[2] as string)) begin();
      origPush.apply(this, args);
    };
    window.history.replaceState = function (...args: unknown[]) {
      if (urlChanged(args[2] as string)) begin();
      origReplace.apply(this, args);
    };
    const onPop = () => begin();
    window.addEventListener("popstate", onPop);

    return () => {
      window.history.pushState = origPush;
      window.history.replaceState = origReplace;
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  // Detect navigation END when the route actually commits.
  useEffect(() => {
    if (!pending.current) return;
    pending.current = false;
    setWidth(100);
    const t = setTimeout(() => {
      setVisible(false);
      setWidth(8);
    }, 280);
    return () => clearTimeout(t);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="sk-progress" role="progressbar" aria-label="Loading" aria-hidden="true">
      <div className="sk-progress-bar" style={{ width: `${width}%` }} />
    </div>
  );
}
