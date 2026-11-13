"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n";

const STEPS: string[] = [
  "$ npm run dev",
  "  ✓ scaffolding Next.js 15 + TypeScript + Tailwind",
  "  ✓ wiring Supabase auth (email magic-link + OAuth)",
  "  ✓ adding Waffo checkout (Buyout + Care)",
  "  ✓ seeding one real AI feature (streaming chat)",
  "  ✓ building the admin dashboard",
  "  ✓ configuring Vercel 1-click deploy",
  "",
  "  ✅ Done in 38s.  Run `npm run dev` to launch.",
];

export function DemoConsole() {
  const { t } = useLanguage();
  const [lines, setLines] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  function run() {
    if (running) return;
    setRunning(true);
    setLines([]);
    let i = 0;
    const id = setInterval(() => {
      // Stop before reading past the end so we never append `undefined`.
      if (i >= STEPS.length) {
        clearInterval(id);
        setRunning(false);
        return;
      }
      const step = STEPS[i] ?? "";
      setLines((prev) => [...prev, step]);
      i += 1;
    }, 260);
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line pb-3 text-muted">
        <span className="h-3 w-3 rounded-full bg-red-400/70" />
        <span className="h-3 w-3 rounded-full bg-yellow-400/70" />
        <span className="h-3 w-3 rounded-full bg-green-400/70" />
        <span className="ml-2 font-mono text-xs">{t("demoConsole.title")}</span>
      </div>
      <div className="min-h-[220px] py-3 font-mono text-[13px] leading-relaxed">
        {lines.length === 0 && !running && (
          <span className="text-muted">{t("demoConsole.hint")}</span>
        )}
        {lines.map((raw, i) => {
          const l = raw ?? "";
          return (
            <div
              key={i}
              className={
                l.includes("✅")
                  ? "text-accent"
                  : l.startsWith("$")
                    ? "text-ink"
                    : "text-ink-soft"
              }
            >
              {l || " "}
            </div>
          );
        })}
        {running && (
          <span className="inline-block animate-pulse text-accent">▋</span>
        )}
      </div>
      <button onClick={run} className="btn-solid w-full" disabled={running}>
        {running ? t("demoConsole.running") : t("demoConsole.btn")}
      </button>
    </div>
  );
}
