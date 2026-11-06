import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SubscriptionRow = {
  id: string;
  user_id: string;
  provider: string; // stripe | creem | paypal | waffo | lemonsqueezy
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  status: string; // active | trialing | canceled | past_due | incomplete
  plan: string | null; // pro | scale
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

/** A subscription counts as "paid" while active or in its free trial. */
export function isSubscribed(row: SubscriptionRow | null): boolean {
  return !!row && (row.status === "active" || row.status === "trialing");
}

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function getSubscription(
  userId: string,
): Promise<SubscriptionRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as SubscriptionRow) ?? null;
}

export async function getCurrentSubscription(): Promise<SubscriptionRow | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return getSubscription(user.id);
}
