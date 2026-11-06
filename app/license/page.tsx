import type { Metadata } from "next";
import { getLang } from "@/lib/i18n-server";
import { LicensePanel } from "@/components/LicensePanel";
import type { Lang } from "@/lib/i18n-core";

export const metadata: Metadata = {
  title: "License",
  description: "Redeem your ShipKit license key to unlock source downloads.",
  robots: { index: false, follow: false },
};

const HEAD: Record<Lang, { eyebrow: string; title: string; body: string }> = {
  en: {
    eyebrow: "LICENSE",
    title: "Activate your ShipKit license",
    body: "After checkout you receive a license key. Redeem it here once and the Builder will unlock downloads on this device. You can also simply sign in with the email you paid with — licenses are claimed automatically.",
  },
  zh: {
    eyebrow: "授权",
    title: "激活 ShipKit 授权",
    body: "付款后会收到 License Key，在此兑换一次即可在本机解锁 Builder 下载。也可以直接用下单邮箱登录，系统会自动认领授权。",
  },
  ja: {
    eyebrow: "ライセンス",
    title: "ShipKit ライセンスを有効化",
    body: "決済後に届くライセンスキーをここで登録すると、この端末で Builder のダウンロードが解除されます。決済時のメールでログインすれば自動的に認領されます。",
  },
  fr: {
    eyebrow: "LICENCE",
    title: "Activer votre licence ShipKit",
    body: "Après le paiement, vous recevez une clé de licence. Activez-la ici une fois pour débloquer les téléchargements sur cet appareil. Vous pouvez aussi vous connecter avec l'e-mail de paiement : la licence est alors reconnue automatiquement.",
  },
  de: {
    eyebrow: "LIZENZ",
    title: "Aktivieren Sie Ihre ShipKit-Lizenz",
    body: "Nach dem Kauf erhalten Sie einen Lizenzschlüssel. Lösen Sie ihn hier einmal ein, um Downloads im Builder auf diesem Gerät freizuschalten. Sie können sich auch einfach mit der E-Mail anmelden, mit der Sie bezahlt haben — Lizenzen werden automatisch abgerufen.",
  },
};

export default async function LicensePage() {
  const lang = await getLang();
  const h = HEAD[lang];
  return (
    <section className="wrap py-12 sm:py-20">
      <div className="max-w-2xl">
        <div className="eyebrow mb-3">{h.eyebrow}</div>
        <h1 className="text-3xl font-semibold sm:text-4xl">{h.title}</h1>
        <p className="mt-4 text-ink-soft">{h.body}</p>
      </div>
      <div className="mt-10 max-w-2xl">
        <LicensePanel />
      </div>
    </section>
  );
}
