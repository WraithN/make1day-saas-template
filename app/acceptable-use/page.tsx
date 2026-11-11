import type { Metadata } from "next";
import { getLang } from "@/lib/i18n-server";
import { langAlternatePaths, variantCanonical } from "@/lib/seo-alternates";
import { AUP_INTRO, AUP_SECTIONS } from "@/lib/content/aup";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
}): Promise<Metadata> {
  const { lang } = await searchParams;
  const canonical = variantCanonical("/acceptable-use", lang);
  return {
    title: "Acceptable Use Policy",
    description:
      "Prohibited uses, NSFW filtering and enforcement for make1day's AI generation surfaces (assistant chat, document Q&A, Video Studio).",
    alternates: {
      canonical,
      languages: langAlternatePaths("/acceptable-use"),
    },
    openGraph: { url: canonical },
  };
}

export default async function AcceptableUsePage() {
  const lang = await getLang();
  const pick = (t: Record<string, string>) => t[lang] ?? t.en;

  return (
    <article className="wrap max-w-3xl py-12 sm:py-16">
      <div className="eyebrow mb-3">
        {lang === "zh" ? "政策" : lang === "ja" ? "ポリシー" : lang === "fr" ? "POLITIQUE" : lang === "de" ? "RICHTLINIE" : "POLICY"}
      </div>
      <h1 className="text-3xl font-semibold sm:text-4xl">
        {lang === "zh"
          ? "可接受使用政策"
          : lang === "ja"
            ? "利用許容ポリシー"
            : lang === "fr"
              ? "Politique d'utilisation acceptable"
              : lang === "de"
                ? "Acceptable-Use-Policy"
                : "Acceptable Use Policy"}
      </h1>
      <p className="mt-2 text-[13px] text-muted">
        {lang === "zh"
          ? "最近更新：2026-11-10"
          : lang === "ja"
            ? "最終更新：2026-11-10"
            : lang === "fr"
              ? "Dernière mise à jour : 10/11/2026"
              : lang === "de"
                ? "Zuletzt aktualisiert: 10.11.2026"
                : "Last updated: 2026-11-10"}
      </p>

      <p className="mt-6 leading-relaxed text-ink-soft">{pick(AUP_INTRO)}</p>

      {AUP_SECTIONS.map((s) => (
        <section key={s.id} className="mt-10">
          <h2 className="text-xl font-semibold">{pick(s.title)}</h2>
          <ul className="mt-4 space-y-3">
            {s.bullets.map((b, i) => (
              <li key={i} className="flex gap-3 leading-relaxed text-ink-soft">
                <span className="mt-[2px] shrink-0 font-bold text-accent">•</span>
                <span>{pick(b)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="mt-10 border-t border-line pt-6 text-[13px] text-muted">
        {lang === "zh"
          ? "本政策与《服务条款》《隐私政策》共同构成使用协议；冲突时以本政策的安全条款为准。"
          : lang === "ja"
            ? "本ポリシーは利用規約・プライバシーポリシーと一体です。抵触時は本ポリシーの安全条項が優先します。"
            : lang === "fr"
              ? "Cette politique complète les CGU et la politique de confidentialité ; ses clauses de sécurité prévalent en cas de conflit."
              : lang === "de"
                ? "Diese Policy ergänzt AGB und Datenschutzerklärung; im Konflikt gehen ihre Sicherheitsklauseln vor."
                : "This policy complements the Terms and Privacy Policy; its safety clauses prevail in case of conflict."}
      </p>
    </article>
  );
}
