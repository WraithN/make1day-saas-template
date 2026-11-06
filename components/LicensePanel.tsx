"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n-core";

const TEXT: Record<
  Lang,
  {
    title: string;
    body: string;
    placeholder: string;
    redeem: string;
    buying: string;
    invalid: string;
    success: string;
    active: string;
    manage: string;
    note: string;
  }
> = {
  en: {
    title: "Unlock downloads",
    body: "Generating the full source ZIP requires a license. Buy once ($99) and paste the key you received — or sign in with the email you used at checkout to unlock automatically.",
    placeholder: "Paste your license key (SK1.…)",
    redeem: "Redeem license",
    buying: "Get a license",
    invalid: "That key is invalid or expired.",
    success: "License redeemed — you can download now.",
    active: "Active license",
    manage: "Redeem a different key",
    note: "No license yet? The free preview shows the file inventory and the design tokens — no source code. Keys are stored in an httpOnly cookie on this device.",
  },
  zh: {
    title: "解锁下载",
    body: "生成完整源码 ZIP 需要授权。一次性购买（$99）后粘贴收到的 License Key，或用下单邮箱登录即可自动解锁。",
    placeholder: "粘贴 License Key（SK1.…）",
    redeem: "兑换授权",
    buying: "购买授权",
    invalid: "密钥无效或已过期。",
    success: "授权成功，现在可以下载了。",
    active: "当前授权有效",
    manage: "更换密钥",
    note: "还没有授权？免费预览会给你文件清单和设计令牌，不含源码。密钥保存在本机的 httpOnly Cookie 中。",
  },
  ja: {
    title: "ダウンロードを解除",
    body: "完全なソース ZIP の生成にはライセンスが必要です。買い切り（$99）後に届いたキーを貼り付けるか、決済時と同じメールでログインすると自動解除されます。",
    placeholder: "ライセンスキーを貼り付け（SK1.…）",
    redeem: "ライセンスを登録",
    buying: "ライセンスを購入",
    invalid: "キーが無効か期限切れです。",
    success: "登録完了。ダウンロードできます。",
    active: "ライセンス有効",
    manage: "別のキーを登録",
    note: "ライセンスがまだの場合は無料プレビュー（ファイル一覧とデザイントークン、ソースコードなし）を利用できます。キーは httpOnly Cookie に保存されます。",
  },
  fr: {
    title: "Débloquer les téléchargements",
    body: "La génération du ZIP source complet nécessite une licence. Achetez une fois (99 $) et collez la clé reçue, ou connectez-vous avec l'e-mail utilisé lors du paiement pour un déblocage automatique.",
    placeholder: "Collez votre clé de licence (SK1.…)",
    redeem: "Activer la licence",
    buying: "Obtenir une licence",
    invalid: "Clé invalide ou expirée.",
    success: "Licence activée — téléchargement disponible.",
    active: "Licence active",
    manage: "Changer de clé",
    note: "Pas encore de licence ? L'aperçu gratuit montre l'inventaire des fichiers et les tokens de design — sans code source. La clé est stockée dans un cookie httpOnly.",
  },
  de: {
    title: "Downloads freischalten",
    body: "Für die Generierung des vollständigen Source-ZIP ist eine Lizenz erforderlich. Kaufen Sie einmalig (99 $) und fügen Sie den erhaltenen Schlüssel ein — oder melden Sie sich mit der E-Mail an, die Sie beim Kauf verwendet haben, um automatisch freizuschalten.",
    placeholder: "Lizenzschlüssel einfügen (SK1.…)",
    redeem: "Lizenz einlösen",
    buying: "Lizenz erhalten",
    invalid: "Dieser Schlüssel ist ungültig oder abgelaufen.",
    success: "Lizenz eingelöst — Sie können jetzt herunterladen.",
    active: "Aktive Lizenz",
    manage: "Anderen Schlüssel einlösen",
    note: "Noch keine Lizenz? Die kostenlose Vorschau zeigt die Dateiliste und die Design-Tokens — ohne Quellcode. Schlüssel werden in einem httpOnly-Cookie auf diesem Gerät gespeichert.",
  },
};

type Status = {
  gateEnabled: boolean;
  redeemed: boolean;
  plan: string | null;
  email: string | null;
  expiresAt: string | null;
};

export function LicensePanel({
  onRedeemed,
  compact = false,
}: {
  onRedeemed?: () => void;
  compact?: boolean;
}) {
  const { lang } = useLanguage();
  const s = TEXT[lang];
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/license")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: Status | null) => setStatus(j))
      .catch(() => setStatus(null));
  }, []);

  async function redeem() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/license", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ licenseKey: key }),
      });
      if (!res.ok) {
        setError(s.invalid);
        return;
      }
      const j = await res.json();
      setStatus({
        gateEnabled: true,
        redeemed: true,
        plan: j.plan,
        email: j.email,
        expiresAt: j.expiresAt,
      });
      setDone(true);
      setKey("");
      onRedeemed?.();
    } catch {
      setError(s.invalid);
    } finally {
      setBusy(false);
    }
  }

  const active = status?.redeemed || done;

  return (
    <div className={compact ? "mt-4 border-t border-line pt-4" : "card"}>
      <div className="eyebrow mb-2">{s.title}</div>
      {active && (
        <p className="mb-3 text-sm text-accent">
          {done ? s.success : s.active}
          {status?.plan ? ` · ${status.plan}` : ""}
        </p>
      )}
      <p className="text-sm text-ink-soft">{s.body}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          className="input min-w-0 flex-1 font-mono text-xs"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={s.placeholder}
          aria-label={s.placeholder}
        />
        <button className="btn-solid shrink-0" onClick={redeem} disabled={busy || !key.trim()}>
          {active ? s.manage : s.redeem}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
        <a className="btn" href="/pricing" data-cta="license-buy">{s.buying}</a>
        <a className="text-accent hover:underline" href="/license">{s.note}</a>
      </div>
    </div>
  );
}
