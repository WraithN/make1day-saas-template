"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";

type Props = {
  /** ISO-8601 end timestamp (server-provided). Falls back to
   *  NEXT_PUBLIC_BLACK_FRIDAY_ENDS_AT when omitted. */
  endsAt?: string;
};

type Remaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
};

function compute(end: number): Remaining {
  const diff = end - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  }
  const s = Math.floor(diff / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    done: false,
  };
}

/**
 * Live countdown for the Black Friday offer. Entirely client-side; the server
 * page passes the ISO end time as a prop so the markup is correct on first
 * paint (no hydration mismatch from a server-computed time). When no end time
 * is configured it degrades to a static "limited time" tag instead of a clock.
 */
export function BlackFridayCountdown({ endsAt }: Props) {
  const { t } = useLanguage();
  const iso = endsAt || process.env.NEXT_PUBLIC_BLACK_FRIDAY_ENDS_AT || "";
  const target = iso ? new Date(iso).getTime() : NaN;
  const valid = Number.isFinite(target);

  // Hydration-safe: the initial render (server AND client) shows static
  // placeholder digits, because compute() reads Date.now() and the two renders
  // happen at different wall-clock seconds. The clock starts in an effect.
  const [mounted, setMounted] = useState(false);
  const [remaining, setRemaining] = useState<Remaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    done: !valid,
  });

  useEffect(() => {
    if (!valid) return;
    setMounted(true);
    const tick = () => setRemaining(compute(target));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target, valid]);

  // No end time configured → just show the limited-time eyebrow, no numbers.
  if (!valid) {
    return (
      <p className="font-mono text-xs uppercase tracking-wide text-accent">
        {t("blackfriday.eyebrow")}
      </p>
    );
  }

  if (remaining.done) return null;

  const cells: [number, string][] = [
    [remaining.days, t("blackfriday.unit.days")],
    [remaining.hours, t("blackfriday.unit.hours")],
    [remaining.minutes, t("blackfriday.unit.minutes")],
    [remaining.seconds, t("blackfriday.unit.seconds")],
  ];

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="font-mono text-xs uppercase tracking-wide text-ink-soft">
        {t("blackfriday.countdown")}
      </p>
      <div className="flex items-stretch gap-2 sm:gap-3">
        {cells.map(([value, label]) => (
          <div
            key={label}
            className="card flex min-w-[58px] flex-col items-center px-3 py-2"
          >
            <span className="text-2xl font-bold tabular-nums text-ink sm:text-3xl">
              {mounted ? String(value).padStart(2, "0") : "--"}
            </span>
            <span className="mt-1 text-[10px] uppercase tracking-wide text-muted">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
