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
 * Two navigation-START detectors, because one is not enough:
 *   1. A capture-phase document click listener on internal <a> elements — the
 *      App Router only writes history AFTER the RSC payload has been fetched,
 *      so on a slow network a history-patch-only bar stays invisible for the
 *      whole fetch and pops in right before the page swap ("no reaction, then
 *      a sudden load"). Intercepting the click itself shows the bar instantly.
 *   2. history.pushState/replaceState wrapping + `popstate` — covers
 *      programmatic navigation and back/forward, which have no click.
 * The navigation END is the pathname actually changing (route committed).
 * Version-proof, no deps.
 *
 * While pending the bar CREEPS in easing steps (10 → 22 → 38 → … → 90) so a
 * long fetch keeps visible progress instead of slamming to a fixed width.
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
  timers: ReturnType<typeof setTimeout>[];
};

/** Creep schedule for a pending navigation: [delayMs, width%]. */
const CREEP: [number, number][] = [
  [60, 10],
  [420, 22],
  [1100, 38],
  [2300, 55],
  [4000, 70],
  [6000, 82],
  [8500, 90],
];

function cancelVisuals(s: BarState) {
  if (s.raf !== null) {
    cancelAnimationFrame(s.raf);
    s.raf = null;
  }
  for (const t of s.timers) clearTimeout(t);
  s.timers = [];
}

/** True when this URL doesn't actually leave the current page. */
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
    timers: [],
  });

  // Detect navigation START.
  useEffect(() => {
    bar.current.alive = true;

    const begin = () => {
      if (bar.current.pending) return; // already creeping; don't reset the bar
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
        // Creep in easing steps so slow fetches keep showing movement.
        for (const [delay, w] of CREEP) {
          bar.current.timers.push(
            setTimeout(() => {
              if (bar.current.alive && bar.current.pending) setWidth(w);
            }, delay),
          );
        }
      });
    };

    // 1) Click on an internal link: start BEFORE the router starts fetching.
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (!a) return;
      if (a.hasAttribute("download")) return;
      const target = a.getAttribute("target");
      if (target && target !== "_self") return;
      const href = a.getAttribute("href") ?? "";
      if (href.startsWith("#") || href.startsWith("javascript:")) return;
      if (/^(mailto:|tel:)/i.test(href)) return;
      try {
        const url = new URL(a.href, window.location.href);
        if (url.origin !== window.location.origin) return; // external
        if (isNoopUrl(url.href)) return; // same page, anchor or repeat link
      } catch {
        return;
      }
      begin();
    };
    document.addEventListener("click", onClick, true);

    // 2) Programmatic navigation and back/forward.
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
      document.removeEventListener("click", onClick, true);
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
    bar.current.timers.push(
      setTimeout(() => {
        if (!bar.current.alive) return;
        setVisible(false);
        setWidth(8);
      }, 280),
    );
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="sk-progress" role="progressbar" aria-label="Loading" aria-hidden="true">
      <div className="sk-progress-bar" style={{ width: `${width}%` }} />
    </div>
  );
}
