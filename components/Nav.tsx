"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isDemoMode, DEMO_COOKIE } from "@/lib/demo";
import { useLanguage } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";

// `pruneNav()` rewrites ACCOUNT_HREF + the label when the generated build
// doesn't include the user console, so nothing ever points at a missing route.
const ACCOUNT_HREF = "/account";
const LOGIN_HREF = "/login";

export function Nav() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();

  useEffect(() => {
    // Demo mode: the dashboard is reachable via the mock session cookie.
    if (isDemoMode()) {
      const demo =
        typeof document !== "undefined" &&
        document.cookie
          .split(";")
          .some((c) => c.trim().startsWith(`${DEMO_COOKIE}=`));
      if (demo) setLoggedIn(true);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setLoggedIn(!!session?.user),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  // Close the mobile sheet on navigation and on Escape.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const links = [
    { href: "/blog", label: t("nav.blog") },
    { href: "/styles", label: t("nav.styles") },
    { href: "/builder", label: t("nav.builder") },
    { href: "/support", label: t("nav.support") },
    { href: "/pricing", label: t("nav.pricing") },
  ];

  const account = {
    href: loggedIn ? ACCOUNT_HREF : LOGIN_HREF,
    label: loggedIn ? t("nav.account") : t("nav.login"),
    solid: loggedIn,
  };

  const accountClass = (solid: boolean) =>
    solid ? "btn-solid w-full sm:w-auto" : "btn-ghost w-full sm:w-auto";

  return (
    // Solid bg (no backdrop-blur): compositing layers drop subpixel AA and
    // make the nav text look fuzzy.
    <header className="sticky top-0 z-50 border-b border-line/70 bg-bg">
      <nav className="wrap flex h-14 items-center justify-between gap-3">
        <Link href="/" className="shrink-0 font-semibold tracking-tight">
          Ship<span className="text-accent">Kit</span>
          <span className="ml-2 hidden font-mono text-[11px] font-medium text-ink-soft sm:inline">
            by Uncorne
          </span>
        </Link>

        {/* ── Desktop (>= md) ── */}
        <div className="hidden items-center gap-4 text-sm text-ink-soft md:flex">
          <LanguageSwitcher />
          <ThemeToggle />
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              data-cta={`nav-${l.href.replace("/", "")}`}
              className="hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href={account.href}
            data-cta={account.solid ? "nav-account" : "nav-login"}
            className={accountClass(account.solid)}
          >
            {account.label}
          </Link>
        </div>

        {/* ── Mobile (< md): language + theme stay reachable, links collapse ── */}
        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitcher />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={t("nav.menu")}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line text-ink-soft transition-colors hover:border-accent/50 hover:text-ink"
          >
            {open ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {open && (
        <div id="mobile-menu" className="border-t border-line bg-bg md:hidden">
          <div className="wrap flex flex-col gap-1 py-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                data-cta={`nav-${l.href.replace("/", "")}`}
                onClick={() => setOpen(false)}
                className="flex min-h-[44px] items-center rounded-lg px-3 text-ink-soft transition-colors hover:bg-surface hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2">
              <Link
                href={account.href}
                data-cta={account.solid ? "nav-account" : "nav-login"}
                onClick={() => setOpen(false)}
                className={accountClass(account.solid)}
              >
                {account.label}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
