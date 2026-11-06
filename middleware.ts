import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isDemoMode, DEMO_COOKIE } from "@/lib/demo";
import { guardPremium } from "@/lib/paywall";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-cookie";
import { adminClosedResponse } from "@/lib/admin-guard";

const LANGS = ["en", "zh", "ja", "fr", "de"];

function adminAllowlist(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Content paywall interception (edge): hard-redirect premium routes to
  // /pricing for unentitled visitors while the license gate is ON. Runs first
  // so the rule applies to every area, including the consoles.
  const premiumRes = await guardPremium(request, pathname);
  if (premiumRes) return premiumRes;

  // Language via ?lang=xx: remember the choice in a cookie for human return
  // visits, and forward an `x-sk-lang` request header so server components
  // (including the root layout, which cannot read searchParams) render the
  // right language for crawlers hitting the hreflang URLs. We DO NOT strip the
  // param or redirect — keeping /?lang=zh serves localized HTML directly.
  const langParam = request.nextUrl.searchParams.get("lang");
  const validLang =
    langParam && (LANGS as string[]).includes(langParam) ? langParam : null;

  const reqHeaders = new Headers(request.headers);
  if (validLang) reqHeaders.set("x-sk-lang", validLang);

  // Forward the (possibly language-augmented) request to the app.
  const nextRes = () =>
    validLang
      ? NextResponse.next({ request: { headers: reqHeaders } })
      : NextResponse.next();

  const withLang = (res: NextResponse) => {
    if (validLang) {
      res.cookies.set("sk_lang", validLang, {
        path: "/",
        maxAge: 31536000,
        sameSite: "lax",
      });
    }
    return res;
  };

  // Two consoles, two different guards:
  //   /account/*  — end-user area, needs a signed-in user (or demo cookie).
  //   /admin/*    — operator area, locked behind the operator sign-in.
  const userArea =
    pathname.startsWith("/account") || pathname.startsWith("/dashboard");
  const adminArea = pathname.startsWith("/admin");

  // The Edge runtime cannot reach the local database, so this is only a
  // PRESENCE check for the operator session cookie. The authoritative
  // validation happens in app/admin/layout.tsx (Node runtime), which either
  // renders the console or the in-page sign-in screen.
  const operatorSession = !!request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

  if (adminArea && !operatorSession) {
    const closed = adminClosedResponse();
    if (closed) return closed;
    // Every admin route but the console root lands on the sign-in screen, so
    // an operator who followed a deep link still gets the form (and is sent
    // back to where they were aiming once the session exists).
    if (pathname !== "/admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.searchParams.set("next", pathname);
      return withLang(NextResponse.redirect(url));
    }
  }

  const redirectToLogin = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return withLang(NextResponse.redirect(url));
  };

  // Demo mode: allow the signed-in areas when the mock session cookie is
  // present. The admin area still needs its own sign-in.
  if (isDemoMode()) {
    if (userArea && !request.cookies.get(DEMO_COOKIE)) return redirectToLogin();
    return withLang(nextRes());
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase isn't configured yet, skip auth gating instead of crashing
  // the route (e.g. when previewing the template before filling env vars).
  // In that state the admin area stays reachable only via the operator
  // sign-in handled above.
  if (!url || !anon) {
    return withLang(nextRes());
  }

  let response = nextRes();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = nextRes();
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (userArea && !user) return redirectToLogin();

  // Real RBAC for the admin area: a signed-in user must hold an admin or
  // staff role (persisted on the profiles table) OR be in the ADMIN_EMAILS
  // seed. Members are rejected with 403. The operator session (checked
  // above) is an independent, parallel way in.
  if (adminArea && !operatorSession) {
    if (!user) {
      // No Supabase session either — the console renders its own sign-in
      // screen, which also accepts the operator credentials.
      const target = request.nextUrl.clone();
      target.pathname = "/admin";
      target.searchParams.set("next", pathname);
      return withLang(NextResponse.redirect(target));
    }
    let isAdminByRole = false;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      isAdminByRole = data?.role === "admin" || data?.role === "staff";
    } catch {
      // profiles table / role column not yet migrated — fall back to seed.
    }
    const isAdminBySeed = adminAllowlist().includes(
      (user.email ?? "").toLowerCase(),
    );
    if (!isAdminByRole && !isAdminBySeed) {
      return withLang(new NextResponse("Forbidden", { status: 403 }));
    }
  }

  return withLang(response);
}

export const config = {
  matcher: [
    // Run on all pages, but skip API routes, Next internals and static files.
    "/((?!api|_next/|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
