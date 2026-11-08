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

/**
 * Fail-safe: the operator area is CLOSED in EVERY environment until a real
 * credential source exists. The old implementation only closed it in
 * production, which meant a dev/staging deployment exposed the console (and
 * its default `change-me` credentials) with no sign-in at all.
 */
export function adminClosedResponse(): NextResponse | null {
  if (isAdminConfigured() || isSupabaseConfigured()) return null;
  return NextResponse.json(
    {
      error: "admin_not_configured",
      message:
        "Set ADMIN_USER and ADMIN_PASSWORD (or configure Supabase) before enabling the admin area.",
    },
    { status: 503 },
  );
}

/** Refuse the documented placeholder credentials in any environment. */
export function isWeakAdminPassword(): boolean {
  const password = adminPassword()?.trim().toLowerCase() ?? "";
  return (
    !password ||
    password.length < 12 ||
    ["change-me", "changeme", "admin", "password", "secret", "test"].includes(
      password,
    )
  );
}
