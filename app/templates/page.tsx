import type { Metadata } from "next";
import Link from "next/link";
import { Trans } from "@/lib/i18n";
import { getCanonicalLang, getLang } from "@/lib/i18n-server";
import { langAlternatePaths, variantCanonical } from "@/lib/seo-alternates";
import { TEMPLATES } from "@/lib/content/templates";
import { TemplateCard } from "@/components/TemplateCard";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  // The root layout's title template appends "· make1day.dev" — don't add it here.
  const title = lang === "zh" ? "样板间" : "Templates";
  const description =
    lang === "zh"
      ? "看看每个 make1day.dev 模板真实生成的站点——点击即可在线预览。"
      : "See a live preview of the site each make1day.dev template generates — click to open it.";
  const canonical = variantCanonical("/templates", await getCanonicalLang());
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: langAlternatePaths("/templates"),
    },
    openGraph: { url: canonical },
  };
}

export default async function TemplatesPage() {
  const lang = await getLang();

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="tech-grid pointer-events-none absolute inset-0" />
        <div className="wrap relative z-10 py-14 text-center doodle-rise sm:py-20">
          <div className="eyebrow mb-4">
            <Trans k="templates.eyebrow" lang={lang} />
          </div>
          <h1 className="doodle-headline mx-auto max-w-3xl text-[30px] leading-[1.35] text-ink sm:text-[42px]">
            <Trans k="templates.title" lang={lang} />
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[14px] leading-relaxed text-ink-soft">
            <Trans k="templates.subtitle" lang={lang} />
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href="/builder"
              className="btn-solid btn-hero w-full text-[16px] sm:w-auto"
            >
              <Trans k="templates.ctaGenerator" lang={lang} />
            </Link>
            <Link
              href="/styles"
              className="btn-ghost w-full text-[16px] sm:w-auto"
            >
              <Trans k="templates.ctaThemes" lang={lang} />
            </Link>
          </div>
        </div>
      </section>

      {(["ai", "classic"] as const).map((grp) => {
        const items = TEMPLATES.filter((tpl) => tpl.group === grp);
        if (!items.length) return null;
        return (
          <section key={grp} className="wrap pb-14">
            <h2 className="mb-5 text-[22px] font-semibold">
              <Trans k={grp === "ai" ? "templates.groupAi" : "templates.groupClassic"} lang={lang} />
            </h2>
            <p className="-mt-3 mb-6 text-[13px] text-muted">
              <Trans k={grp === "ai" ? "templates.groupAiNote" : "templates.groupClassicNote"} lang={lang} />
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((tpl) => (
                <TemplateCard key={tpl.slug} tpl={tpl} lang={lang} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
