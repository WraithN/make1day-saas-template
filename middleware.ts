import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isDemoMode, DEMO_COOKIE } from "@/lib/demo";
import { guardPremium } from "@/lib/paywall";

const LANGS = ["en", "zh", "ja", "fr"];

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

  // Two consoles, two different guards:
  //   /account/*  — end-user area, needs a signed-in user (or demo cookie).
  //   /admin/*    — operator area, HTTP Basic Auth + optional email allowlist.
  const userArea =
    pathname.startsWith("/account") || pathname.startsWith("/dashboard");
  const adminArea = pathname.startsWith("/admin");

  // Admin area: protect /admin with HTTP Basic Auth when ADMIN_USER /
  // ADMIN_PASSWORD are configured. Without them the route is open (template
  // default) so the console is reachable in dev without secrets — the UI
  // shows a loud warning in that case.
  if (adminArea) {
    const user = process.env.ADMIN_USER;
    const pass = process.env.ADMIN_PASSWORD;
    if (user && pass) {
      const auth = request.headers.get("authorization");
      const expected =
        "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
      if (auth !== expected) {
        return new NextResponse("Authentication required", {
          status: 401,
          headers: { "WWW-Authenticate": 'Basic realm="ShipKit Admin"' },
        });
      }
    }
  }

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

  const redirectToLogin = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return withLang(NextResponse.redirect(url));
  };

  // Demo mode: allow the signed-in areas when the mock session cookie is
  // present. Admin stays reachable (Basic Auth above still applies).
  if (isDemoMode()) {
    if (userArea && !request.cookies.get(DEMO_COOKIE)) return redirectToLogin();
    return withLang(nextRes());
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase isn't configured yet, skip auth gating instead of crashing
  // the route (e.g. when previewing the template before filling env vars).
  // In that state the admin area stays reachable only via Basic Auth (above).
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
  // seed. Members are rejected with 403; unauthenticated hits are sent to
  // login. Basic Auth (above) remains an optional second factor.
  if (adminArea) {
    if (!user) return redirectToLogin();
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
