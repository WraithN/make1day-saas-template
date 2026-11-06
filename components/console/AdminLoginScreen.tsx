"use client";

// The operator sign-in screen.
//
// Why this exists instead of HTTP Basic Auth: a Basic-Auth challenge renders a
// native browser dialog that embedded previews, kiosk browsers and every
// non-Chrome client refuse to show — the visitor just sees a bare
// "Authentication required" body with no way to type a password. This form
// exchanges the operator credentials for an opaque session cookie instead.

import { useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type AdminLoginCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  username: string;
  usernamePlaceholder: string;
  password: string;
  submit: string;
  submitting: string;
  errorMissing: string;
  errorInvalid: string;
  errorRateLimited: string;
  errorUnknown: string;
  hint: string;
  notConfigured: string;
  security: string;
  accountLink: string;
};

type Props = {
  copy: AdminLoginCopy;
  /** False when no operator account exists yet (env vars missing). */
  configured: boolean;
  /** True when a Supabase sign-in is also accepted for this deployment. */
  supabaseEnabled: boolean;
};

export function AdminLoginScreen({
  copy,
  configured,
  supabaseEnabled,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname() ?? "/admin";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!username.trim() || !password) {
      setError(copy.errorMissing);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        // Only same-origin, absolute paths are accepted — never an open redirect.
        const next = params.get("next") ?? pathname;
        const target =
          next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
        router.replace(target);
        router.refresh();
        return;
      }
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (res.status === 401) setError(copy.errorInvalid);
      else if (res.status === 429) setError(copy.errorRateLimited);
      else if (res.status === 400) setError(copy.errorMissing);
      else setError(body?.error ? copy.errorUnknown : copy.errorUnknown);
    } catch {
      setError(copy.errorUnknown);
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <div className="wrap flex min-h-[70vh] items-center justify-center py-16">
        <div className="card w-full max-w-md space-y-3">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 className="text-lg font-semibold">{copy.title}</h1>
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
            {copy.notConfigured}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap flex min-h-[70vh] items-center justify-center py-16">
      <div className="card w-full max-w-md space-y-5">
        <div className="space-y-1.5">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 className="text-lg font-semibold tracking-tight">{copy.title}</h1>
          <p className="text-sm text-ink-soft">{copy.subtitle}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="sk-admin-user"
              className="block text-xs uppercase tracking-wide text-muted"
            >
              {copy.username}
            </label>
            <input
              id="sk-admin-user"
              name="username"
              className="input"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder={copy.usernamePlaceholder}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={busy}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="sk-admin-pass"
              className="block text-xs uppercase tracking-wide text-muted"
            >
              {copy.password}
            </label>
            <input
              id="sk-admin-pass"
              name="password"
              type="password"
              className="input"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          <button type="submit" className="btn-solid w-full" disabled={busy}>
            {busy ? copy.submitting : copy.submit}
          </button>
        </form>

        <p className="text-xs leading-relaxed text-muted">{copy.hint}</p>
        <p className="text-xs leading-relaxed text-muted">{copy.security}</p>

        {supabaseEnabled && (
          <a
            href="/login?redirect=/admin"
            className="btn-ghost w-full"
            aria-label={copy.accountLink}
          >
            {copy.accountLink}
          </a>
        )}
      </div>
    </div>
  );
}
