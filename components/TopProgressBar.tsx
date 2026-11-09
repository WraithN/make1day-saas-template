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
 *
 * IMPORTANT: the App Router writes history while React is running an insertion
 * effect, where setState is forbidden ("useInsertionEffect must not schedule
 * updates"). All state updates kicked off from the patched methods therefore
 * run in a microtask, after that commit phase has finished.
 */

type BarState = {
  /** A navigation has started and the new pathname has not committed yet. */
  pending: boolean;
  /** A begin() microtask is already queued; don't stack duplicates. */
  scheduled: boolean;
  /** Guards against updates after unmount (StrictMode double-mount included). */
  alive: boolean;
  raf: number | null;
  timer: ReturnType<typeof setTimeout> | null;
};

function cancelVisuals(s: BarState) {
  if (s.raf !== null) {
    cancelAnimationFrame(s.raf);
    s.raf = null;
  }
  if (s.timer !== null) {
    clearTimeout(s.timer);
    s.timer = null;
  }
}

/** True when this history write doesn't actually change the URL. */
function isNoopUrl(url?: string | URL | null): boolean {
  if (url == null) return true;
  try {
    // Relative paths (/templates, ?lang=zh, #features) must be resolved
    // before comparing with location.href, otherwise every write looks new.
    return new URL(String(url), window.location.href).href === window.location.href;
  } catch {
    return true;
  }
}

export function TopProgressBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(8);
  const bar = useRef<BarState>({
    pending: false,
    scheduled: false,
    alive: true,
    raf: null,
    timer: null,
  });

  // Detect navigation START.
  useEffect(() => {
    bar.current.alive = true;

    const begin = () => {
      bar.current.pending = true;
      if (bar.current.scheduled) return;
      bar.current.scheduled = true;

      // Escape React's insertion-effect commit phase. Calling setState
      // synchronously inside a patched pushState/replaceState throws because
      // Next.js calls those methods from useInsertionEffect.
      queueMicrotask(() => {
        bar.current.scheduled = false;
        // A prefetched navigation may have committed before this microtask ran.
        if (!bar.current.alive || !bar.current.pending) return;
        cancelVisuals(bar.current);
        setVisible(true);
        setWidth(8);
        bar.current.raf = requestAnimationFrame(() => {
          bar.current.raf = null;
          if (bar.current.alive && bar.current.pending) setWidth(90);
        });
      });
    };

    const origPush = window.history.pushState as (...a: any[]) => void;
    const origReplace = window.history.replaceState as (...a: any[]) => void;
    window.history.pushState = function (...args: unknown[]) {
      if (!isNoopUrl(args[2] as string | URL | null)) begin();
      origPush.apply(this, args);
    };
    window.history.replaceState = function (...args: unknown[]) {
      if (!isNoopUrl(args[2] as string | URL | null)) begin();
      origReplace.apply(this, args);
    };
    const onPop = () => begin();
    window.addEventListener("popstate", onPop);

    return () => {
      bar.current.alive = false;
      bar.current.pending = false;
      window.history.pushState = origPush;
      window.history.replaceState = origReplace;
      window.removeEventListener("popstate", onPop);
      cancelVisuals(bar.current);
    };
  }, []);

  // Detect navigation END when the route actually commits.
  useEffect(() => {
    if (!bar.current.pending) return;
    bar.current.pending = false;
    cancelVisuals(bar.current);
    setWidth(100);
    bar.current.timer = setTimeout(() => {
      bar.current.timer = null;
      if (!bar.current.alive) return;
      setVisible(false);
      setWidth(8);
    }, 280);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="sk-progress" role="progressbar" aria-label="Loading" aria-hidden="true">
      <div className="sk-progress-bar" style={{ width: `${width}%` }} />
    </div>
  );
}
