"use client";

import { createBrowserClient } from "@supabase/ssr";

// Inert placeholders so the marketing pages render even before the user
// configures Supabase. Real auth only works once NEXT_PUBLIC_SUPABASE_* are set;
// until then, sign-in calls fail gracefully instead of white-screening the app.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

/** Supabase client for the browser (Client Components). */
export function createSupabaseBrowserClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
