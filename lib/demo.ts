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
  const flag = process.env.NEXT_PUBLIC_ENABLE_DEMO?.trim().toLowerCase();
  if (flag === "false") return false;
  // Development keeps the zero-config dashboard preview. PRODUCTION is
  // closed by default: a stray env var can no longer create a one-cookie
  // login backdoor on a deployed site. Re-enabling it there requires BOTH
  // explicit flags so it can never happen by accident.
  if (process.env.NODE_ENV === "production") {
    return flag === "true" && process.env.DEMO_IN_PRODUCTION === "true";
  }
  return true;
}

export const DEMO_USER = {
  id: "demo-user",
  email: "demo@example.com",
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
