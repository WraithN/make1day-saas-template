"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isDemoMode, DEMO_COOKIE } from "@/lib/demo";
import { useLanguage } from "@/lib/i18n";

export function SignOut() {
  const router = useRouter();
  const { t } = useLanguage();

  async function out() {
    if (isDemoMode()) {
      // Clear the mock session cookie and return home.
      document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0`;
      router.push("/");
      router.refresh();
      return;
    }
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button className="btn-ghost" onClick={out}>
      {t("nav.logout")}
    </button>
  );
}
