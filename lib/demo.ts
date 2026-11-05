// Demo / mock-auth mode.
//
// Demo mode exists ONLY so a freshly-cloned template (before Supabase is
// configured) can show a dashboard instead of white-screening. It must never
// bypass real authentication in a deployed app: once Supabase env vars are
// present, the mock session is disabled regardless of ENABLE_DEMO.

export const DEMO_COOKIE = "sk_demo";

export function isDemoMode(): boolean {
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  // A configured auth backend always wins — no opt-in backdoor.
  if (supabaseConfigured) return false;
  if (process.env.NEXT_PUBLIC_ENABLE_DEMO === "false") return false;
  return true;
}

export const DEMO_USER = {
  id: "demo-user",
  email: "demo@shipkit.dev",
};

export const DEMO_SUBSCRIPTION = {
  id: "demo-sub",
  user_id: "demo-user",
  provider: "waffo",
  provider_customer_id: "demo_customer",
  provider_subscription_id: "demo_subscription",
  status: "active",
  plan: "buyout",
  current_period_end: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
} as const;
