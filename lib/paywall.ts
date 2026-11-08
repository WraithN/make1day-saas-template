import { NextResponse, type NextRequest } from "next/server";
import { isLicenseGateEnabled } from "@/lib/env";

// ───────────────────────────────────────────────────────────────
// Content paywall interception for generated marketit sites.
//
// These helpers are part of the CORE and are never pruned, so any generated
// project — even one that did not pick the "premium" Builder feature — can
// enable a content paywall simply by setting PREMIUM_ROUTES. When the
// "premium" feature IS selected, the runnable /premium sample page and the
// reusable <Paywall> component are also shipped.
//
// Two complementary layers share one entitlement concept:
//   1. Edge interception (middleware): premium routes are hard-redirected to
//      /pricing for visitors who carry NO license credential while the license
//      gate is ON. This is the fast first-pass guard that runs on the Edge
//      runtime, so it is deliberately dependency-free (no node:crypto).
//   2. Component-level gating (<Paywall>): authoritative, server-side check
//      (HMAC key / subscription / email claim) on ANY page/section. The locked
//      body is never sent to the client. This is the real enforcement point.
//
// The middleware only looks for a credential; the component verifies it. A
// request that reaches the page with a credential is re-checked there, so no
// content is ever leaked to an unentitled visitor.
// ───────────────────────────────────────────────────────────────

const DEFAULT_ROUTES = ["/premium"];
const LICENSE_HEADER = "x-shipkit-license";
const LICENSE_COOKIE = "sk_license";

/**
 * Premium route prefixes to intercept, from PREMIUM_ROUTES (comma-separated,
 * e.g. "/premium,/courses"). Defaults to ["/premium"] so the canonical sample
 * route is protected out of the box; set to an empty string to disable edge
 * interception entirely.
 */
export function premiumRoutes(): string[] {
  const raw = process.env.PREMIUM_ROUTES;
  if (raw === "" || raw == null) return raw === "" ? [] : DEFAULT_ROUTES;
  const routes = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.startsWith("/") ? s : `/${s}`));
  return routes.length ? routes : DEFAULT_ROUTES;
}

/** True when `pathname` equals or sits beneath a configured premium route. */
export function isPremiumPath(pathname: string): boolean {
  return premiumRoutes().some(
    (r) => pathname === r || pathname.startsWith(`${r}/`),
  );
}

/** Extract a license key from the request header or cookie (edge-safe). */
function licenseKeyFromRequest(req: NextRequest): string | undefined {
  const header = req.headers.get(LICENSE_HEADER)?.trim();
  if (header) return header;
  const cookie = req.cookies.get(LICENSE_COOKIE)?.value?.trim();
  return cookie || undefined;
}

/**
 * Best-effort edge signal that the visitor MIGHT be entitled, so we must let
 * the page-level <Paywall> make the final call rather than redirecting them.
 * Covers the two edge-readable credentials: an offline license key, and a
 * Supabase session cookie (a signed-in user could hold an active subscription
 * the Edge runtime cannot verify here). When neither is present the visitor is
 * clearly anonymous and can be redirected to /pricing for a better UX.
 */
function mightBeEntitled(req: NextRequest): boolean {
  if (licenseKeyFromRequest(req)) return true;
  const cookie = req.headers.get("cookie") ?? "";
  return /(?:^|;\s*)sb-[^=]+-auth-token=/.test(cookie);
}

/**
 * Edge interception for middleware. Returns a redirect to /pricing (carrying
 * the original path in `?from=`) when:
 *   - the license gate is ON,
 *   - the path is a premium route, and
 *   - the visitor carries no entitlement signal (no license key, no session).
 * It NEVER blocks a signed-in user — a Supabase session cookie means a
 * subscription/email claim could apply, so we defer to the page-level
 * <Paywall> (Node runtime) for the authoritative check. Returns null when no
 * interception is needed (gate off, a public path, or a possible entitlement).
 */
export async function guardPremium(
  req: NextRequest,
  pathname: string,
): Promise<NextResponse | null> {
  if (!isLicenseGateEnabled()) return null;
  if (!isPremiumPath(pathname)) return null;
  if (mightBeEntitled(req)) return null;

  const url = req.nextUrl.clone();
  url.pathname = "/pricing";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}
