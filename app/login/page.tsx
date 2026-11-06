"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";
import { isDemoMode, DEMO_USER } from "@/lib/demo";
import { useLanguage } from "@/lib/i18n";

type OAuthProvider = "google" | "github" | "apple" | "microsoft" | "gitlab" | "slack";

const OAUTH_META: Record<OAuthProvider, { label: string; cls: string }> = {
  google: { label: "Google", cls: "btn-ghost" },
  github: { label: "GitHub", cls: "btn-ghost" },
  apple: { label: "Apple", cls: "btn-ghost" },
  microsoft: { label: "Microsoft", cls: "btn-ghost" },
  gitlab: { label: "GitLab", cls: "btn-ghost" },
  slack: { label: "Slack", cls: "btn-ghost" },
};

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Providers enabled via NEXT_PUBLIC_OAUTH_PROVIDERS (defaults to the four below).
  const providers = env
    .oauthProviders()
    .filter((p): p is OAuthProvider => p in OAUTH_META);

  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback?redirect=/account`
      : "";

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  }

  async function oauth(provider: OAuthProvider) {
    setErr("");
    // Map our UI keys to Supabase's provider identifiers where they differ.
    const supabaseProvider =
      provider === "microsoft" ? "azure" : provider === "slack" ? "slack_oidc" : provider;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: supabaseProvider as never,
      options: { redirectTo },
    });
    if (error) setErr(error.message);
  }

  return (
    <section className="wrap flex min-h-[70vh] items-center justify-center py-16">
      <div className="card w-full max-w-sm">
        <h1 className="text-2xl font-semibold">{t("login.title")}</h1>
        <p className="mt-2 text-sm text-ink-soft">{t("login.subtitle")}</p>

        {sent ? (
          <div className="mt-6 rounded-lg border border-accent/40 bg-accent/10 p-4 text-sm text-accent">
            {t("login.sent")}
          </div>
        ) : (
          <form onSubmit={sendMagicLink} className="mt-6 space-y-3">
            <input
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
            <button className="btn-solid w-full" disabled={busy}>
              {busy ? t("login.sending") : t("login.send")}
            </button>
          </form>
        )}

        {providers.length > 0 && (
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" /> {t("login.or")}{" "}
              <span className="h-px flex-1 bg-line" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {providers.map((p) => (
                <button
                  key={p}
                  className={OAUTH_META[p].cls}
                  onClick={() => oauth(p)}
                >
                  {OAUTH_META[p].label}
                </button>
              ))}
            </div>
          </>
        )}

        {isDemoMode() && (
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" /> demo{" "}
              <span className="h-px flex-1 bg-line" />
            </div>
            <button
              type="button"
              className="btn w-full"
              onClick={() => {
                document.cookie =
                  "sk_demo=1; path=/; max-age=86400; samesite=lax";
                router.push("/account");
              }}
            >
              Demo 登录（体验账号 {DEMO_USER.email}）
            </button>
            <p className="mt-2 text-center text-xs text-muted">
              未配置 Supabase 时的演示入口，仅用于本地预览。
            </p>
          </>
        )}

        {err && <p className="mt-4 text-sm text-red-400">{err}</p>}
      </div>
    </section>
  );
}
