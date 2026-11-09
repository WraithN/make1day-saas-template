import Link from "next/link";
import { Trans } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n-core";

// Example use-cases built with make1day. These are illustrative (the product is
// a generator + theme system, not a directory of customer sites yet), so the
// copy stays honest: each card points at the tool that would produce it.
const EXAMPLES: {
  title: string;
  en: string;
  tag: string;
  href: string;
}[] = [
  { title: "独立咖啡馆官网", en: "Cafe & restaurant site", tag: "Local business", href: "/styles" },
  { title: "个人作品集", en: "Personal portfolio", tag: "Creator", href: "/styles" },
  { title: "SaaS 落地页", en: "SaaS landing page", tag: "Startup", href: "/builder" },
  { title: "技术博客", en: "Tech blog", tag: "Content", href: "/blog" },
  { title: "线上课程", en: "Online course", tag: "Education", href: "/styles" },
  { title: "活动页面", en: "Event page", tag: "Marketing", href: "/builder" },
];

const VIEW_EXAMPLE: Record<string, string> = {
  en: "View example",
  zh: "查看示例",
  ja: "見る",
  fr: "Voir",
  de: "Ansehen",
};

export function ShowcaseSection({
  lang,
  withCta = true,
}: {
  lang: Lang;
  withCta?: boolean;
}) {
  const viewExample = VIEW_EXAMPLE[lang] ?? VIEW_EXAMPLE.en;
  return (
    <section className="sk-font wrap py-14 sm:py-20">
      <div className="text-center">
        <div className="eyebrow mb-3">
          <Trans k="showcase.eyebrow" lang={lang} />
        </div>
        <h2 className="text-[20px] font-semibold text-ink sm:text-[24px]">
          <Trans k="showcase.title" lang={lang} />
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-[14px] leading-relaxed text-muted">
          <Trans k="showcase.subtitle" lang={lang} />
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EXAMPLES.map((e) => (
          <Link
            key={e.title}
            href={e.href}
            className="card group block p-5 transition-transform hover:-translate-y-1"
          >
            <span className="inline-block rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-accent">
              {e.tag}
            </span>
            <h3 className="mt-3 text-[16px] font-semibold text-ink">
              {e.title}
            </h3>
            <p className="mt-1 text-[13px] text-muted">{e.en}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-ink-soft transition-colors group-hover:text-accent">
              {viewExample} →
            </span>
          </Link>
        ))}
      </div>

      {withCta && (
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/builder"
            className="btn-solid text-[15px]"
          >
            <Trans k="showcase.ctaGenerator" lang={lang} />
          </Link>
          <Link href="/styles" className="btn-ghost text-[15px]">
            <Trans k="showcase.ctaThemes" lang={lang} />
          </Link>
        </div>
      )}
    </section>
  );
}
