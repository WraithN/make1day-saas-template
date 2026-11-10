import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isDemoMode, DEMO_COOKIE } from "@/lib/demo";
import { guardPremium } from "@/lib/paywall";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-cookie";
import { adminClosedResponse } from "@/lib/admin-guard";
import { assertSameOrigin, isServerToServerApi } from "@/lib/csrf";
import { verifyAdminSession } from "@/lib/admin-cookie-sig";

const LANGS = ["en", "zh", "ja", "fr", "de"];

function adminAllowlist(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Canonical-host enforcement (production only, self-gating): the Vercel
  // deployment hostname and the bare apex 301 to NEXT_PUBLIC_SITE_URL's host
  // once a custom domain is live. While SITE_URL still equals the vercel.app
  // host (pre-switch) nothing redirects, so preview URLs keep working.
  if (process.env.NODE_ENV === "production") {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const canonHost = siteUrl ? new URL(siteUrl).host : "";
    const host = request.headers.get("host") ?? "";
    const apex = canonHost.replace(/^www\./, "");
    if (
      canonHost &&
      host &&
      host !== canonHost &&
      (host.endsWith(".vercel.app") ||
        (host === apex && canonHost.startsWith("www.")))
    ) {
      const url = request.nextUrl.clone();
      url.protocol = "https:";
      url.host = canonHost;
      return NextResponse.redirect(url, 301);
    }
  }

  // GEO: `?format=md` on any public page returns a plain-text representation
  // of that exact URL. Restricted to public GET pages so the rewrite can
  // never be used to bypass a console guard or an API same-origin check.
  if (
    request.method === "GET" &&
    request.nextUrl.searchParams.get("format") === "md" &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/account") &&
    !pathname.startsWith("/dashboard")
  ) {
    const url = request.nextUrl.clone();
    const lang = url.searchParams.get("lang") ?? "en";
    url.pathname = "/api/markdown";
    url.search = "";
    url.searchParams.set("path", pathname);
    url.searchParams.set("lang", lang);
    return NextResponse.rewrite(url);
  }

  // API routes: global same-origin / CSRF check at the Edge. The matcher used
  // to skip /api entirely, leaving every write endpoint unprotected. Node
  // handlers add persistent rate limits through lib/http-guard.ts; webhooks,
  // cron calls and MCP clients are server-to-server and have no browser Origin.
  if (pathname.startsWith("/api/")) {
    if (!isServerToServerApi(pathname) && !assertSameOrigin(request)) {
      return NextResponse.json(
        { error: "cross_site_request_rejected" },
        { status: 403 },
      );
    }
    return NextResponse.next();
  }

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
    pathname.startsWith("/account") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/video");
  const adminArea = pathname.startsWith("/admin");

  // The Edge runtime cannot reach SQLite, but it CAN verify the HMAC on the
  // session cookie. A forged cookie no longer skips this branch. The Node
  // layout still performs the authoritative session lookup.
  const operatorSession = !!(await verifyAdminSession(
    request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
  ));

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

  // If Supabase isn't configured yet, use the LOCAL password session (or the
  // development demo cookie) instead of leaving the user console wide open.
  // The Node-side getCurrentUser() still validates the session authoritatively.
  if (!url || !anon) {
    const hasLocalSession = !!request.cookies.get("sk_local_session")?.value;
    const hasDemo = !!request.cookies.get(DEMO_COOKIE)?.value;
    if (userArea && !hasLocalSession && !hasDemo) return redirectToLogin();
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
    // Pages: Next internals and static files are skipped.
    "/((?!_next/|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
    // Every API route runs the same-origin check above.
    "/api/:path*",
  ],
};
