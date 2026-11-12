import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isDemoMode, DEMO_COOKIE } from "@/lib/demo";
import { guardPremium } from "@/lib/paywall";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-cookie";
import { adminClosedResponse } from "@/lib/admin-guard";
import { assertSameOrigin, isServerToServerApi } from "@/lib/csrf";
import { verifyAdminSession } from "@/lib/admin-cookie-sig";

const LANGS = ["en", "zh", "ja", "fr", "de"];
/** Non-English locales get a URL path prefix (/zh/pricing). EN is the
 *  bare path, so it never grows a second homepage. */
const LOCALE_PREFIXES = ["zh", "ja", "fr", "de"];

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

  const localeSeg = pathname.split("/")[1] ?? "";
  const hasPrefix = LOCALE_PREFIXES.includes(localeSeg);
  const queryLang = request.nextUrl.searchParams.get("lang") ?? "";

  // ── i18n: localized URLs are path-prefixed (/zh/pricing, /ja/blog/slug). ──
  // 1. Legacy `?lang=xx` URLs 301 onto the path form. Every backlink, shared
  //    link and previously-submitted sitemap entry keeps its signal and
  //    consolidates into the self-canonicalized localized URL.
  // 2. `/zh/…` rewrites to the underlying route with `x-sk-lang` (what the
  //    page renders) plus `x-sk-locale` (only present when the URL itself
  //    carries the prefix — metadata uses it so bare paths canonicalized by
  //    cookie still declare the EN URL as canonical).
  // 3. `sk_lang` cookie: set on any prefixed visit (and still honoured below
  //    ?lang-less bare paths), so a visitor who entered via /zh/ keeps their
  //    language when following in-page links that use the bare path.
  if (
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/admin") &&
    queryLang &&
    LANGS.includes(queryLang) &&
    !hasPrefix
  ) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("lang");
    url.pathname =
      queryLang === "en"
        ? pathname || "/"
        : `/${queryLang}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url, 301);
  }
  if (localeSeg === "en" && (pathname === "/en" || pathname.startsWith("/en/"))) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 301);
  }

  // The path this request logically serves (prefix stripped).
  const logicalPath = hasPrefix
    ? pathname.slice(localeSeg.length + 1) || "/"
    : pathname;

  // make1day's own store hides the hosted video-workflow pages entirely:
  // the store sells the module as source code and operates NO public
  // generation entry point (merchant-of-record review treats any such entry
  // on the selling site as disqualifying). Customer builds ship this same
  // middleware with SHOW_VIDEO_STUDIO unset (= visible).
  if (
    (process.env.SHOW_VIDEO_STUDIO ?? "true").toLowerCase() === "false" &&
    (logicalPath === "/video" || logicalPath.startsWith("/video/"))
  ) {
    return NextResponse.rewrite(new URL("/_not-found", request.url), {
      status: 404,
    });
  }

  // GEO: `?format=md` on any public page returns a plain-text representation
  // of that exact URL. Restricted to public GET pages so the rewrite can
  // never be used to bypass a console guard or an API same-origin check.
  if (
    request.method === "GET" &&
    request.nextUrl.searchParams.get("format") === "md" &&
    !logicalPath.startsWith("/api/") &&
    !logicalPath.startsWith("/admin") &&
    !logicalPath.startsWith("/account") &&
    !logicalPath.startsWith("/dashboard")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/api/markdown";
    url.search = "";
    url.searchParams.set("path", logicalPath);
    url.searchParams.set(
      "lang",
      hasPrefix ? localeSeg : request.nextUrl.searchParams.get("lang") ?? "en",
    );
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
  const premiumRes = await guardPremium(request, logicalPath);
  if (premiumRes) return premiumRes;

  const reqHeaders = new Headers(request.headers);
  if (hasPrefix) reqHeaders.set("x-sk-lang", localeSeg);
  if (hasPrefix) reqHeaders.set("x-sk-locale", localeSeg);
  // A bare-path request with no prefix serves the cookie language to humans;
  // crawlers and the sitemap always use the prefixed canonical forms.

  // Forward the (possibly locale-augmented) request to the app. With a prefix
  // this is an internal rewrite to the stripped path so the browser URL keeps
  // /zh/… — which is what the self-canonical and hreflang tags declare.
  const forward = () => {
    if (hasPrefix) {
      const url = request.nextUrl.clone();
      url.pathname = logicalPath === "" ? "/" : logicalPath;
      return NextResponse.rewrite(url, { request: { headers: reqHeaders } });
    }
    return NextResponse.next({ request: { headers: reqHeaders } });
  };

  const withLangCookie = (res: NextResponse) => {
    if (hasPrefix) {
      res.cookies.set("sk_lang", localeSeg, {
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
    logicalPath.startsWith("/account") ||
    logicalPath.startsWith("/dashboard") ||
    logicalPath.startsWith("/video");
  const adminArea = logicalPath.startsWith("/admin");

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
    if (logicalPath !== "/admin") {
      const url = request.nextUrl.clone();
      url.pathname = hasPrefix ? `/${localeSeg}/admin` : "/admin";
      url.searchParams.set("next", logicalPath);
      return withLangCookie(NextResponse.redirect(url));
    }
  }

  const redirectToLogin = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", hasPrefix ? pathname : logicalPath);
    return withLangCookie(NextResponse.redirect(url));
  };

  // Demo mode: allow the signed-in areas when the mock session cookie is
  // present. The admin area still needs its own sign-in.
  if (isDemoMode()) {
    if (userArea && !request.cookies.get(DEMO_COOKIE)) return redirectToLogin();
    return withLangCookie(forward());
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
    return withLangCookie(forward());
  }

  let response = forward();

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
          response = forward();
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
      target.pathname = hasPrefix ? `/${localeSeg}/admin` : "/admin";
      target.searchParams.set("next", logicalPath);
      return withLangCookie(NextResponse.redirect(target));
    }
    let isAdminByRole = false;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .eq("product", process.env.PRODUCT_ID?.trim() || "default")
        .maybeSingle();
      isAdminByRole = data?.role === "admin" || data?.role === "staff";
    } catch {
      // profiles table / role column not yet migrated — fall back to seed.
    }
    const isAdminBySeed = adminAllowlist().includes(
      (user.email ?? "").toLowerCase(),
    );
    if (!isAdminByRole && !isAdminBySeed) {
      return withLangCookie(new NextResponse("Forbidden", { status: 403 }));
    }
  }

  return withLangCookie(response);
}

export const config = {
  matcher: [
    // Pages: Next internals and static files are skipped.
    "/((?!_next/|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
    // Every API route runs the same-origin check above.
    "/api/:path*",
  ],
};
