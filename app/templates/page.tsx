import type { Metadata } from "next";
import Link from "next/link";
import { Trans } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { TEMPLATES } from "@/lib/content/templates";
import { TemplateCard } from "@/components/TemplateCard";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const { lang = "en" } = await searchParams;
  // The root layout's title template appends "· make1day" — don't add it here.
  const title = lang === "zh" ? "样板间" : "Templates";
  const description =
    lang === "zh"
      ? "看看每个 make1day 模板真实生成的站点——点击即可在线预览。"
      : "See a live preview of the site each make1day template generates — click to open it.";
  return {
    title,
    description,
    alternates: {
      languages: {
        en: "/templates",
        zh: "/templates?lang=zh",
        ja: "/templates?lang=ja",
        fr: "/templates?lang=fr",
        de: "/templates?lang=de",
      },
    },
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

      <section className="wrap pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((tpl) => (
            <TemplateCard key={tpl.slug} tpl={tpl} lang={lang} />
          ))}
        </div>
      </section>
    </>
  );
}
