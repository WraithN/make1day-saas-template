"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { msgCopy } from "@/lib/content/messaging";

export type AuthMode = "forgot" | "reset" | "verify";

type Feedback =
  | "idle"
  | "sent"
  | "ok"
  | "invalid"
  | "error"
  | "mismatch"
  | "weak"
  | "limited";

/**
 * Shared client form for the three auth-recovery pages. Copy is five-language
 * and reactive (useLanguage). All three flows deliberately show a GENERIC
 * success on "send" so they never reveal whether an address exists.
 */
export function AuthFlow({
  mode,
  initialToken = "",
  initialTokenHash = "",
  initialStatus = "",
}: {
  mode: AuthMode;
  initialToken?: string;
  initialTokenHash?: string;
  initialStatus?: string;
}) {
  const { lang } = useLanguage();
  const c = msgCopy(lang);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(
    initialStatus === "ok" ? "ok" : initialStatus === "invalid" ? "invalid" : "idle",
  );

  const title =
    mode === "forgot"
      ? c["auth.forgotTitle"]
      : mode === "reset"
        ? c["auth.resetTitle"]
        : c["auth.verifyTitle"];
  const subtitle =
    mode === "forgot"
      ? c["auth.forgotSubtitle"]
      : mode === "reset"
        ? c["auth.resetSubtitle"]
        : c["auth.verifySubtitle"];
  const submitLabel =
    mode === "verify" ? c["auth.verifySend"] : c["auth.submit"];

  const messages: Record<Feedback, string> = {
    idle: "",
    sent: mode === "forgot" ? c["auth.forgotSent"] : c["auth.verifySent"],
    ok: mode === "reset" ? c["auth.resetOk"] : c["auth.verifyOk"],
    invalid: mode === "reset" ? c["auth.resetInvalid"] : c["auth.verifyInvalid"],
    error: c["auth.genericError"],
    mismatch: c["auth.mismatch"],
    weak: c["auth.weak"],
    limited: c["support.limited"],
  };

  async function post(payload: Record<string, unknown>): Promise<number> {
    const endpoint =
      mode === "verify" ? "/api/auth/verify-email" : "/api/auth/password-reset";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, lang }),
    });
    return res.status;
  }

  function mapStatus(status: number): Feedback {
    if (status >= 200 && status < 300) return mode === "verify" || mode === "forgot" ? "sent" : "ok";
    if (status === 429) return "limited";
    if (status === 400) return "invalid";
    return "error";
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFeedback("idle");
    try {
      if (mode === "forgot") {
        setFeedback(mapStatus(await post({ action: "request", email })));
      } else if (mode === "reset") {
        if (password.length < 8) {
          setFeedback("weak");
          return;
        }
        if (password !== confirmPassword) {
          setFeedback("mismatch");
          return;
        }
        setFeedback(
          mapStatus(
            await post({ action: "confirm", token: initialToken, password }),
          ),
        );
      } else if (initialToken || initialTokenHash) {
        // Confirm a token that arrived on this page (rather than via the GET
        // redirect). 200 → "ok" rather than the generic "sent".
        const status = await post({
          action: "confirm",
          token: initialToken || undefined,
          tokenHash: initialTokenHash || undefined,
        });
        setFeedback(status >= 200 && status < 300 ? "ok" : mapStatus(status));
      } else {
        setFeedback(mapStatus(await post({ action: "send", email })));
      }
    } catch {
      setFeedback("error");
    } finally {
      setBusy(false);
    }
  }

  const showEmail = mode === "forgot" || (mode === "verify" && !initialToken && !initialTokenHash);
  const showPasswords = mode === "reset";
  const positive = feedback === "ok" || feedback === "sent";

  return (
    <div className="card w-full max-w-sm p-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-ink-soft">{subtitle}</p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        {showEmail && (
          <input
            type="email"
            required
            maxLength={320}
            placeholder={c["auth.email"]}
            aria-label={c["auth.email"]}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        )}
        {showPasswords && (
          <>
            <input
              type="password"
              required
              minLength={8}
              maxLength={200}
              placeholder={c["auth.password"]}
              aria-label={c["auth.password"]}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
            <input
              type="password"
              required
              minLength={8}
              maxLength={200}
              placeholder={c["auth.passwordConfirm"]}
              aria-label={c["auth.passwordConfirm"]}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
            />
          </>
        )}
        <button className="btn-solid w-full" type="submit" disabled={busy}>
          {busy ? c["auth.sending"] : submitLabel}
        </button>
      </form>

      {feedback !== "idle" && (
        <p
          role="status"
          className={`mt-4 rounded-lg border p-3 text-sm ${
            positive
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-red-400/40 bg-red-400/10 text-red-400"
          }`}
        >
          {messages[feedback]}
        </p>
      )}

      <div className="mt-5 text-center text-xs text-muted">
        <Link href="/login" className="underline underline-offset-2 hover:text-ink">
          {c["auth.backLogin"]}
        </Link>
      </div>
    </div>
  );
}
