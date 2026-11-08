"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n-core";

const TEXT: Record<
  Lang,
  { title: string; body: string; password: string; submit: string; error: string }
> = {
  en: {
    title: "Sign in with a password",
    body: "This install uses local accounts. Use the password you set through the reset flow.",
    password: "Password",
    submit: "Sign in",
    error: "Email or password is incorrect.",
  },
  zh: {
    title: "使用密码登录",
    body: "当前部署使用本地账户。请输入你通过重置流程设置的密码。",
    password: "密码",
    submit: "登录",
    error: "邮箱或密码不正确。",
  },
  ja: {
    title: "パスワードでログイン",
    body: "この環境はローカルアカウントを使用します。再設定したパスワードを入力してください。",
    password: "パスワード",
    submit: "ログイン",
    error: "メールアドレスまたはパスワードが正しくありません。",
  },
  fr: {
    title: "Connexion par mot de passe",
    body: "Cette installation utilise des comptes locaux. Saisissez le mot de passe défini lors de la réinitialisation.",
    password: "Mot de passe",
    submit: "Se connecter",
    error: "Adresse e-mail ou mot de passe incorrect.",
  },
  de: {
    title: "Mit Passwort anmelden",
    body: "Diese Installation nutzt lokale Konten. Geben Sie das beim Zurücksetzen festgelegte Passwort ein.",
    password: "Passwort",
    submit: "Anmelden",
    error: "E-Mail-Adresse oder Passwort ist falsch.",
  },
};

export function LocalLoginForm() {
  const { lang } = useLanguage();
  const router = useRouter();
  const s = TEXT[lang];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/auth/local", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "login", email, password }),
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      router.push("/account");
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3 border-t border-line pt-5">
      <div className="eyebrow">{s.title}</div>
      <p className="text-xs text-muted">{s.body}</p>
      <input
        type="email"
        required
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input"
        aria-label="Email"
      />
      <input
        type="password"
        required
        placeholder={s.password}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="input"
        aria-label={s.password}
      />
      <button className="btn-solid w-full" disabled={busy || !email || !password}>
        {s.submit}
      </button>
      {error && <p className="text-sm text-red-400">{s.error}</p>}
    </form>
  );
}
