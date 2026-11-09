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

  // Black Friday nav entry is gated behind the same NEXT_PUBLIC_ flag the
  // /black-friday page reads, so the link only appears while the promo is on
  // (it is inlined at build time, so a rebuild is needed to toggle it).
  const blackFridayActive =
    process.env.NEXT_PUBLIC_BLACK_FRIDAY_ACTIVE === "true";

  // A link is "active" when we're on its route (or a sub-route, e.g. /blog/x).
  // This is the post-click feedback that tells the visitor "you landed here".
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  const accountActive = loggedIn
    ? pathname.startsWith("/account")
    : pathname === "/login";

  // Product navigation, in the order the brand story tells: Home (the door)
  // → Generator (the core conversion entry) → Themes (second revenue line)
  // → Showcase (social proof) → Blog (learning) → Support (care). Language /
  // theme switches and Pricing / Account are rendered separately, to the right,
  // so they never interrupt the product flow.
  const productLinks = [
    { href: "/", label: t("nav.home") },
    { href: "/builder", label: t("nav.builder") },
    { href: "/styles", label: t("nav.styles") },
    { href: "/showcase", label: t("nav.showcase") },
    { href: "/blog", label: t("nav.blog") },
    { href: "/support", label: t("nav.support") },
    ...(blackFridayActive
      ? [{ href: "/black-friday", label: t("nav.blackfriday") }]
      : []),
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
    <header className="sk-nav sticky top-0 z-50 border-b border-line/70 bg-bg">
      <nav className="wrap flex h-14 items-center justify-between gap-3">
        {/* Keep this <Link> className verbatim: customerNavBrand() matches it
            structurally to swap in the customer's own app name. */}
        <Link href="/" className="shrink-0 font-semibold tracking-tight">
          make1day
        </Link>

        {/* ── Desktop (>= md) ── */}
        <div className="hidden items-center gap-4 text-sm text-ink-soft md:flex">
          {productLinks.map((l) => {
            const active = isActive(l.href);
            const bf = l.href === "/black-friday";
            return (
              <Link
                key={l.href}
                href={l.href}
                data-cta={`nav-${l.href.replace("/", "") || "home"}`}
                aria-current={active ? "page" : undefined}
                className={
                  bf
                    ? active
                      ? "nav-bf-pill nav-bf-pill-active"
                      : "nav-bf-pill"
                    : active
                      ? "nav-link nav-link-active"
                      : "nav-link"
                }
              >
                {l.label === t("nav.builder") && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                    className="mr-1 -mt-0.5 inline-block"
                  >
                    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
                  </svg>
                )}
                {l.label}
              </Link>
            );
          })}
          <LanguageSwitcher />
          <ThemeToggle />
          <Link
            href="/pricing"
            data-cta="nav-pricing"
            aria-current={isActive("/pricing") ? "page" : undefined}
            className={
              isActive("/pricing") ? "nav-link nav-link-active" : "nav-link"
            }
          >
            {t("nav.pricing")}
          </Link>
          <Link
            href={account.href}
            data-cta={account.solid ? "nav-account" : "nav-login"}
            aria-current={accountActive ? "page" : undefined}
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
            {productLinks.map((l) => {
              const active = isActive(l.href);
              const bf = l.href === "/black-friday";
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  data-cta={`nav-${l.href.replace("/", "") || "home"}`}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={
                    bf
                      ? active
                        ? "nav-bf-pill nav-bf-pill-active my-1"
                        : "nav-bf-pill my-1"
                      : active
                        ? "flex min-h-[44px] items-center rounded-lg px-3 font-semibold text-ink transition-colors active:opacity-70 bg-surface"
                        : "flex min-h-[44px] items-center rounded-lg px-3 text-ink-soft transition-colors hover:bg-surface hover:text-ink active:opacity-70"
                  }
                >
                  {l.label === t("nav.builder") && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                      className="mr-1 inline-block"
                    >
                      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
                    </svg>
                  )}
                  {l.label}
                </Link>
              );
            })}
            <Link
              href="/pricing"
              data-cta="nav-pricing"
              onClick={() => setOpen(false)}
              aria-current={isActive("/pricing") ? "page" : undefined}
              className={
                isActive("/pricing")
                  ? "flex min-h-[44px] items-center rounded-lg px-3 font-semibold text-ink transition-colors active:opacity-70 bg-surface"
                  : "flex min-h-[44px] items-center rounded-lg px-3 text-ink-soft transition-colors hover:bg-surface hover:text-ink active:opacity-70"
              }
            >
              {t("nav.pricing")}
            </Link>
            <div className="mt-2">
              <Link
                href={account.href}
                data-cta={account.solid ? "nav-account" : "nav-login"}
                onClick={() => setOpen(false)}
                aria-current={accountActive ? "page" : undefined}
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
