// Shared guard for the operator admin area (/admin and /api/stats).
//
// Security model: the admin area must NEVER be open to the public. When
// ADMIN_USER / ADMIN_PASSWORD are not configured:
//   * in production we CLOSE the area (503) so it cannot be scraped or abused,
//   * in development we allow access but the UI shows a loud warning, so the
//     operator remembers to set credentials before going live.
//
// Edge-safe: no Node built-ins, so it can be imported from middleware.

import { NextResponse } from "next/server";

export function adminUser(): string | undefined {
  return process.env.ADMIN_USER;
}
export function adminPassword(): string | undefined {
  return process.env.ADMIN_PASSWORD;
}

export function isAdminConfigured(): boolean {
  return !!adminUser() && !!adminPassword();
}

/** 503 when admin creds are missing in production. Null when allowed. */
export function adminClosedResponse(): NextResponse | null {
  if (isAdminConfigured()) return null;
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error: "admin_not_configured",
        message:
          "Set ADMIN_USER and ADMIN_PASSWORD before enabling the admin area in production.",
      },
      { status: 503 },
    );
  }
  return null;
}

/** 401 Basic-Auth challenge when creds are set but the request isn't authorized. */
export function adminUnauthorizedResponse(): NextResponse {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="ShipKit Admin"' },
  });
}

/** True when the request carries the correct Basic credentials. */
export function adminAuthorized(authHeader: string | null): boolean {
  if (!isAdminConfigured()) return false;
  const expected =
    "Basic " +
    Buffer.from(`${adminUser()}:${adminPassword()}`).toString("base64");
  return authHeader === expected;
}
