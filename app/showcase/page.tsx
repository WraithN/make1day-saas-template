import type { Metadata } from "next";
import Link from "next/link";
import { Trans } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { ShowcaseSection } from "@/components/home/ShowcaseSection";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const { lang = "en" } = await searchParams;
  const title =
    lang === "zh"
      ? "案例墙 · make1day"
      : "Showcase · make1day";
  const description =
    lang === "zh"
      ? "看看创作者用 make1day 生成器与主题做出的真实站点示例。"
      : "See example sites makers build with the make1day generator and themes.";
  return {
    title,
    description,
    alternates: {
      languages: {
        en: "/showcase",
        zh: "/showcase?lang=zh",
        ja: "/showcase?lang=ja",
        fr: "/showcase?lang=fr",
        de: "/showcase?lang=de",
      },
    },
  };
}

export default async function ShowcasePage() {
  const lang = await getLang();

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="tech-grid pointer-events-none absolute inset-0" />
        <div className="wrap relative z-10 py-14 text-center doodle-rise sm:py-20">
          <div className="eyebrow mb-4">
            <Trans k="showcase.eyebrow" lang={lang} />
          </div>
          <h1 className="doodle-headline mx-auto max-w-3xl text-[30px] leading-[1.35] text-ink sm:text-[42px]">
            <Trans k="showcase.title" lang={lang} />
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[14px] leading-relaxed text-ink-soft">
            <Trans k="showcase.subtitle" lang={lang} />
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href="/builder"
              className="btn-solid btn-hero w-full text-[16px] sm:w-auto"
            >
              <Trans k="showcase.ctaGenerator" lang={lang} />
            </Link>
            <Link
              href="/styles"
              className="btn-ghost w-full text-[16px] sm:w-auto"
            >
              <Trans k="showcase.ctaThemes" lang={lang} />
            </Link>
          </div>
        </div>
      </section>

      <ShowcaseSection lang={lang} withCta={false} />
    </>
  );
}
