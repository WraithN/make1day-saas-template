"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type ConsoleNavItem = { href: string; label: string };

/**
 * Shared chrome for /account and /admin. A single component keeps both
 * consoles visually identical and makes the generated template's two
 * dashboards feel like one product. Client-side only for the active tab.
 */
export function ConsoleNav({
  items,
  eyebrow,
  title,
  subtitle,
  badge,
  badgeTone = "neutral",
  backLabel,
  rightSlot,
  action,
}: {
  items: ConsoleNavItem[];
  eyebrow: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeTone?: "neutral" | "warning" | "success";
  backLabel: string;
  rightSlot?: { href: string; label: string } | null;
  /** Extra control rendered next to the back link (e.g. sign out). */
  action?: ReactNode;
}) {
  const pathname = usePathname() ?? "";

  // Exactly one tab may be highlighted. A path can match several items by
  // prefix (`/admin/orders` matches both `/admin` and `/admin/orders`), so we
  // keep only the MOST SPECIFIC match — the longest matching href. Without
  // this, the overview tab stays lit on every sub-page.
  const activeHref = items.reduce<string | null>((best, item) => {
    const matches =
      item.href === pathname ||
      (item.href !== "/" && pathname.startsWith(`${item.href}/`));
    if (!matches) return best;
    if (best === null || item.href.length > best.length) return item.href;
    return best;
  }, null);

  const tone =
    badgeTone === "warning"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
      : badgeTone === "success"
        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
        : "border-line bg-surface text-ink-soft";

  return (
    <div className="border-b border-line/70 bg-surface/40">
      <div className="wrap pt-8 sm:pt-12">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="eyebrow mb-2">{eyebrow}</div>
            <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-soft">{subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {badge && (
              <span
                className={`rounded-full border px-3 py-1 font-mono text-[11px] ${tone}`}
              >
                {badge}
              </span>
            )}
            {rightSlot && (
              <Link href={rightSlot.href} className="btn-ghost text-sm">
                {rightSlot.label}
              </Link>
            )}
            {action}
            <Link href="/" className="btn-ghost text-sm">
              {backLabel}
            </Link>
          </div>
        </div>

        <nav
          aria-label={title}
          className="mt-7 flex gap-1 overflow-x-auto pb-3 text-sm"
        >
          {items.map((item) => {
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`min-h-[40px] shrink-0 rounded-lg px-3 py-2 transition-colors ${
                  active
                    ? "border border-accent/40 bg-accent/10 text-accent"
                    : "border border-transparent text-ink-soft hover:border-line hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
