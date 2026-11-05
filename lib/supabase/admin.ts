import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Service-role Supabase client. BYPASSES RLS.
 * Use ONLY on the server (webhooks, admin jobs). Never import into client code.
 */
export function createSupabaseAdminClient() {
  return createClient(
    env.supabaseUrl(),
    env.supabaseServiceRoleKey(),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
