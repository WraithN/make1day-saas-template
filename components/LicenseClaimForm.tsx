"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n-core";

const TEXT: Record<
  Lang,
  {
    title: string;
    body: string;
    placeholder: string;
    submit: string;
    sending: string;
    sent: string;
    invalid: string;
  }
> = {
  en: {
    title: "Lost your key?",
    body: "Enter the email you paid with. If a license exists for that address, we will send the key again — no account or sign-in needed.",
    placeholder: "you@company.com",
    submit: "Email my license key",
    sending: "Sending…",
    sent: "If a license exists for that address, the key is on its way. Check your inbox (and spam folder).",
    invalid: "Please enter a valid email address.",
  },
  zh: {
    title: "找不到密钥？",
    body: "填写下单时使用的邮箱。如果该邮箱有授权，我们会重新发送密钥——无需账号，也无需登录。",
    placeholder: "you@company.com",
    submit: "把密钥发到邮箱",
    sending: "发送中…",
    sent: "如果该邮箱存在授权，密钥正在发送途中。请查收收件箱（以及垃圾邮件）。",
    invalid: "请输入有效的邮箱地址。",
  },
  ja: {
    title: "キーをお忘れですか？",
    body: "決済に使ったメールアドレスを入力してください。そのアドレスにライセンスがあれば、アカウントやログインなしでキーを再送します。",
    placeholder: "you@company.com",
    submit: "ライセンスキーを再送",
    sending: "送信中…",
    sent: "そのアドレスにライセンスがある場合、キーを送信しました。受信箱（迷惑メールも）をご確認ください。",
    invalid: "有効なメールアドレスを入力してください。",
  },
  fr: {
    title: "Clé perdue ?",
    body: "Saisissez l'e-mail utilisé lors du paiement. Si une licence existe pour cette adresse, nous renverrons la clé — sans compte ni connexion.",
    placeholder: "you@company.com",
    submit: "Renvoyer ma clé",
    sending: "Envoi…",
    sent: "Si une licence existe pour cette adresse, la clé est en route. Vérifiez votre boîte de réception (et les indésirables).",
    invalid: "Veuillez saisir une adresse e-mail valide.",
  },
  de: {
    title: "Schlüssel verloren?",
    body: "Geben Sie die beim Kauf verwendete E-Mail-Adresse ein. Falls dafür eine Lizenz existiert, senden wir den Schlüssel erneut — ohne Konto und ohne Anmeldung.",
    placeholder: "you@company.com",
    submit: "Lizenzschlüssel zusenden",
    sending: "Wird gesendet…",
    sent: "Falls für diese Adresse eine Lizenz existiert, ist der Schlüssel unterwegs. Prüfen Sie Posteingang und Spamordner.",
    invalid: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
  },
};

export function LicenseClaimForm() {
  const { lang } = useLanguage();
  const s = TEXT[lang];
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"idle" | "invalid" | "sent">("idle");

  async function submit() {
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setState("invalid");
      return;
    }
    setBusy(true);
    try {
      await fetch("/api/license/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: value, lang }),
      });
      // Always the same UI result — the API never reveals whether a license
      // exists, and neither should this form.
      setState("sent");
      setEmail("");
    } catch {
      setState("sent");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card mt-6">
      <div className="eyebrow mb-2">{s.title}</div>
      <p className="text-sm text-ink-soft">{s.body}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          className="input min-w-0 flex-1"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setState("idle");
          }}
          placeholder={s.placeholder}
          aria-label={s.placeholder}
        />
        <button
          className="btn-solid shrink-0"
          onClick={submit}
          disabled={busy || !email.trim()}
        >
          {busy ? s.sending : s.submit}
        </button>
      </div>
      {state === "invalid" && <p className="mt-2 text-sm text-red-400">{s.invalid}</p>}
      {state === "sent" && <p className="mt-2 text-sm text-accent">{s.sent}</p>}
    </div>
  );
}
