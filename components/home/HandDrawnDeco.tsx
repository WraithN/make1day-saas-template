"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n-core";

/**
 * C-graded hand-drawn hero decorations.
 *
 * Contract (learned the hard way in the prototype):
 *  - every SVG has an explicit width/height, otherwise the browser's default
 *    150px box stretches the stars and the arrow;
 *  - EVERY path carries `pathLength="100"`. The old code used a hand-estimated
 *    `--len` for stroke-dasharray, but the star outline is ~222 user units
 *    while `--len` was 190 — so the last edge was never drawn. Normalising the
 *    path makes the dash math independent of the real geometry: 100 = exactly
 *    one closed lap, 0 = fully stroked. No more missing side;
 *  - the whole decoration layer sits BELOW the copy and has
 *    `pointer-events: none`, so it can never cover a heading or swallow a
 *    click on the CTA;
 *  - decorations are hidden below 720px, where there is no safe whitespace.
 *
 * Motion is opt-in at runtime (`html.sk-motion`) so server-rendered markup
 * never animates and hydration stays stable. The switch persists in
 * localStorage and always yields to `prefers-reduced-motion: reduce`.
 */

const MOTION_KEY = "sk_doodle_motion";

const LABELS: Record<Lang, { on: string; off: string; replay: string; label: string }> = {
  en: { on: "Motion on", off: "Motion off", replay: "Replay", label: "Hand-drawn decorations" },
  zh: { on: "动效：开", off: "动效：关", replay: "重播", label: "手绘装饰" },
  ja: { on: "アニメ：ON", off: "アニメ：OFF", replay: "再生", label: "手描きの装飾" },
  fr: { on: "Anim. : ON", off: "Anim. : OFF", replay: "Rejouer", label: "Décorations dessinées" },
  de: { on: "Anim. : AN", off: "Anim. : AUS", replay: "Wiederholen", label: "Handgezeichnete Dekoration" },
};

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Keep the two <html> classes mutually exclusive. */
function syncMotionClass(on: boolean) {
  const effective = on && !reducedMotion();
  const root = document.documentElement;
  root.classList.toggle("sk-motion", effective);
  root.classList.toggle("sk-no-motion", !effective);
}

export function HandDrawnDeco() {
  const { lang } = useLanguage();
  const copy = LABELS[lang] ?? LABELS.en;
  // SSR-safe: always render "on" first, then reconcile after mount.
  const [motion, setMotion] = useState(true);

  useEffect(() => {
    let stored = "on";
    try {
      stored = localStorage.getItem(MOTION_KEY) ?? "on";
    } catch {
      /* storage disabled — keep the default */
    }
    const on = stored !== "off";
    setMotion(on && !reducedMotion());
    syncMotionClass(on);
  }, []);

  function toggle() {
    const next = !motion;
    setMotion(next);
    try {
      localStorage.setItem(MOTION_KEY, next ? "on" : "off");
    } catch {
      /* ignore */
    }
    syncMotionClass(next);
  }

  function replay() {
    const root = document.documentElement;
    root.classList.remove("sk-motion");
    // Force a reflow so the animations actually restart.
    void root.offsetWidth;
    syncMotionClass(motion);
  }

  return (
    <>
      <div className="doodle-deco" aria-hidden="true">
        <svg
          className="doodle-arrow"
          width="118"
          height="88"
          viewBox="0 0 120 90"
        >
          <path d="M112 78 C86 78 46 62 20 30" pathLength={100} />
          <path d="M6 38 L18 24 L34 30" pathLength={100} />
        </svg>

        <svg
          className="doodle-star"
          width="46"
          height="46"
          viewBox="0 0 64 64"
        >
          <path d="M32 3 L38 24 L60 25 L42 38 L48 60 L32 46 L15 60 L21 38 L3 25 L26 24 Z" pathLength={100} />
        </svg>
        <svg
          className="doodle-star s2"
          width="26"
          height="26"
          viewBox="0 0 64 64"
        >
          <path d="M32 3 L38 24 L60 25 L42 38 L48 60 L32 46 L15 60 L21 38 L3 25 L26 24 Z" pathLength={100} />
        </svg>
        <svg
          className="doodle-star s3"
          width="20"
          height="20"
          viewBox="0 0 64 64"
        >
          <path d="M32 3 L38 24 L60 25 L42 38 L48 60 L32 46 L15 60 L21 38 L3 25 L26 24 Z" pathLength={100} />
        </svg>

        <div className="doodle-note">
          18/18 ZIPs
          <br />
          type-checked
          <br />
          every build
        </div>
      </div>

      <div className="doodle-controls" role="group" aria-label={copy.label}>
        <button type="button" onClick={toggle} aria-pressed={motion} title={copy.label}>
          <span aria-hidden="true">{motion ? "✳" : "○"}</span>
          {motion ? copy.on : copy.off}
        </button>
        <button type="button" onClick={replay} title={copy.replay}>
          <span aria-hidden="true">↻</span>
          <span className="sr-only sm:not-sr-only">{copy.replay}</span>
        </button>
      </div>
    </>
  );
}
