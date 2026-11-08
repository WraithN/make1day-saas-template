// Edge-safe same-origin check. No Node built-ins, no database imports, so it
// can run in middleware.ts as well as in Node route handlers.

/**
 * Browser-side CSRF protection without a session token: reject cross-site
 * fetches via Sec-Fetch-Site, and verify Origin against the request Host.
 * Requests with neither header (curl, native clients, payment webhooks) are
 * allowed — those surfaces are protected by signatures / credentials instead.
 */
export function assertSameOrigin(req: Request): boolean {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return false;
  }
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    const host =
      req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
    return parsed.host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

/** Routes that are called server-to-server and have no browser Origin. */
export function isServerToServerApi(pathname: string): boolean {
  return (
    pathname === "/api/webhook" ||
    pathname.startsWith("/api/cron/") ||
    pathname === "/api/mcp" ||
    pathname === "/api/health"
  );
}
