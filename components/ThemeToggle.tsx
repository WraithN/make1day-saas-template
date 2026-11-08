"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";

/**
 * Switches between the loud highlighter palette (`html` without `light`) and
 * the quiet "plain paper" companion (`html.light`). Both are the same
 * hand-drawn design language, so the sun/moon metaphor was replaced by a
 * colour-swatch icon. `sk_theme` keeps the original storage key so existing
 * visitors keep their preference.
 */
export function ThemeToggle() {
  const { t } = useLanguage();
  const [quiet, setQuiet] = useState(false);

  useEffect(() => {
    setQuiet(document.documentElement.classList.contains("light"));
  }, []);

  function toggle() {
    const next = !quiet;
    setQuiet(next);
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem("sk_theme", next ? "light" : "dark");
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("theme.toggle")}
      aria-pressed={quiet}
      title={t("theme.toggle")}
      className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-ink bg-surface transition-colors hover:bg-accent/10"
    >
      {quiet ? (
        // Plain paper: one muted swatch.
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="6" fill="#b8b0a0" stroke="#111111" strokeWidth="2" />
        </svg>
      ) : (
        // Full palette: three highlighter dots.
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="5" cy="6" r="3.2" fill="#ffd93d" stroke="#111111" strokeWidth="1.4" />
          <circle cx="11" cy="6" r="3.2" fill="#4ecdc4" stroke="#111111" strokeWidth="1.4" />
          <circle cx="8" cy="11" r="3.2" fill="#ff6b6b" stroke="#111111" strokeWidth="1.4" />
        </svg>
      )}
    </button>
  );
}
