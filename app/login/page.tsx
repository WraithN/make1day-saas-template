"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";
import { isDemoMode, DEMO_USER } from "@/lib/demo";
import { useLanguage } from "@/lib/i18n";
import { LocalLoginForm } from "@/components/LocalLoginForm";

type OAuthProvider = "google" | "github" | "apple" | "microsoft" | "gitlab" | "slack";

const OAUTH_META: Record<OAuthProvider, { label: string; cls: string }> = {
  google: { label: "Google", cls: "btn-ghost" },
  github: { label: "GitHub", cls: "btn-ghost" },
  apple: { label: "Apple", cls: "btn-ghost" },
  microsoft: { label: "Microsoft", cls: "btn-ghost" },
  gitlab: { label: "GitLab", cls: "btn-ghost" },
  slack: { label: "Slack", cls: "btn-ghost" },
};

// Inline brand glyphs (Simple Icons, CC0) so the buttons stay recognisable
// without a runtime icon dependency. `.btn-ghost` already centres the icon
// and label via `inline-flex` + `gap`.
const OAUTH_ICONS: Record<OAuthProvider, React.ReactNode> = {
  google: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#181717" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  ),
  apple: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#000000" d="M12.152 6.896c-.022-2.89 2.36-4.285 2.466-4.348-1.344-1.963-3.437-2.23-4.18-2.258-1.78-.18-3.47 1.046-4.37 1.046-.9 0-2.29-1.022-3.76-1.006-1.93.027-3.71 1.12-4.7 2.843-2.01 3.486-.513 8.646 1.44 11.476.96 1.39 2.1 2.94 3.58 2.886 1.43-.057 1.98-.925 3.71-.925 1.72 0 2.21.925 3.73.898 1.55-.028 2.52-1.42 3.46-2.81 1.09-1.61 1.54-3.17 1.56-3.25-3.41-.13-4.84-2.63-4.84-5.09zM9.62 3.38c.79-.96 1.32-2.29 1.18-3.62-1.14.046-2.52.76-3.34 1.72-.73.85-1.37 2.22-1.2 3.52 1.27.098 2.57-.65 3.36-1.62z" />
    </svg>
  ),
  microsoft: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#F25022" d="M0 0h11.377v11.377H0z" />
      <path fill="#7FBA00" d="M12.623 0H24v11.377H12.623z" />
      <path fill="#00A4EF" d="M0 12.623h11.377V24H0z" />
      <path fill="#FFB900" d="M12.623 12.623H24V24H12.623z" />
    </svg>
  ),
  gitlab: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#FC6D26" d="M23.6004 13.2619L22.2933 8.99003C22.1226 8.45234 21.5662 8.15538 21.0285 8.32605L20.6245 8.45353L18.1735 13.6229H5.82651L3.3755 8.45353L2.97153 8.32605C2.43383 8.15538 1.87743 8.45234 1.70673 8.99003L0.399614 13.2619C0.145117 14.0447 0.643856 14.8771 1.45653 14.9919L5.37728 15.5191L7.25924 21.0094C7.43729 21.539 7.98665 21.8481 8.53536 21.7303L9.53711 21.5066L11.5109 15.5191H12.4891L14.4629 21.5066L15.4646 21.7303C16.0133 21.8481 16.5627 21.539 16.7408 21.0094L18.6227 15.5191L22.5435 14.9919C23.3561 14.8771 23.8548 14.0447 23.6004 13.2619Z" />
    </svg>
  ),
  slack: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#36C5F0" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z" />
      <path fill="#2EB67D" d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" />
      <path fill="#ECB22E" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z" />
      <path fill="#E01E5A" d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" />
    </svg>
  ),
};

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Without Supabase Auth, the magic-link/OAuth form has no backend. Show the
  // local password form instead (password resets and verification feed it).
  const localMode = !process.env.NEXT_PUBLIC_SUPABASE_URL;

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
        <h1 className="text-2xl font-extrabold tracking-tight">{t("login.title")}</h1>
        <p className="mt-2 text-sm text-ink-soft">{t("login.subtitle")}</p>

        {sent ? (
          <div className="mt-6 rounded-lg border border-accent/40 bg-accent/10 p-4 text-sm text-accent">
            {t("login.sent")}
          </div>
        ) : localMode ? (
          <LocalLoginForm />
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

        <a
          href="/forgot-password"
          className="mt-4 block text-center text-sm text-accent underline underline-offset-2 hover:text-ink"
        >
          {t("login.forgot")}
        </a>

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
                  {OAUTH_ICONS[p]}
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
