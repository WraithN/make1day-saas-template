"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isDemoMode, DEMO_COOKIE } from "@/lib/demo";

/** Self-contained so /account works even when the demo dashboard is pruned. */
export function SignOutButton({ label }: { label: string }) {
  const router = useRouter();

  async function out() {
    if (isDemoMode()) {
      document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0`;
      router.push("/");
      router.refresh();
      return;
    }
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    // The license cookie is scoped to the download gate, not the session —
    // clearing it here prevents the next user on a shared browser from
    // reusing the previous buyer's key.
    document.cookie = "sk_license=; path=/; max-age=0";
    router.push("/");
    router.refresh();
  }

  return (
    <button type="button" className="btn-ghost text-sm" onClick={out}>
      {label}
    </button>
  );
}
