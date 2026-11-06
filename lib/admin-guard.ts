// Shared guard for the operator admin area (/admin and /api/stats).
//
// Security model: the admin area must NEVER be open to the public. It is
// protected by the operator account (ADMIN_USER / ADMIN_PASSWORD), verified
// against the local database and exchanged for an opaque session cookie.
//
// When neither an operator account nor Supabase is configured:
//   * in production we CLOSE the area (503) so it cannot be scraped or abused,
//   * in development we allow access but the console shows a loud warning, so
//     the operator remembers to set credentials before going live.
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

/** True when Supabase is wired up (its own admin/staff roles can guard /admin). */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** 503 when no credential source exists at all in production. Null when allowed. */
export function adminClosedResponse(): NextResponse | null {
  if (isAdminConfigured() || isSupabaseConfigured()) return null;
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error: "admin_not_configured",
        message:
          "Set ADMIN_USER and ADMIN_PASSWORD (or configure Supabase) before enabling the admin area in production.",
      },
      { status: 503 },
    );
  }
  return null;
}
