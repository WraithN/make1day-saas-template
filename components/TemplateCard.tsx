import Link from "next/link";
import { tr } from "@/lib/i18n-server";
import type { Lang } from "@/lib/i18n-core";
import { themeVars, textureStyle } from "@/lib/generator/themes";
import type { TemplateMeta } from "@/lib/content/templates";

// Gallery card: a live, theme-styled thumbnail of the generated site plus a
// link to the full preview.
export function TemplateCard({
  tpl,
  lang,
}: {
  tpl: TemplateMeta;
  lang: Lang;
}) {
  const name = tpl.name[lang] ?? tpl.name.en;
  const category = tpl.category[lang] ?? tpl.category.en;
  const cta = tpl.primaryCta[lang] ?? tpl.primaryCta.en;

  const thumbStyle = {
    ...themeVars(tpl.styleId),
    backgroundColor: "rgb(var(--bg))",
    color: "rgb(var(--ink))",
  } as React.CSSProperties;

  return (
    <Link
      href={`/templates/${tpl.slug}/preview`}
      className="group block overflow-hidden rounded-2xl border border-line bg-surface transition-transform hover:-translate-y-1"
    >
      {/* Live thumbnail of the generated site. */}
      <div
        className="relative h-44 overflow-hidden"
        style={thumbStyle}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={textureStyle(tpl.styleId)}
        />
        <div className="relative z-10 flex h-full flex-col justify-between p-4">
          <span className="text-[13px] font-bold tracking-tight">{name}</span>
          <div>
            <span className="tag">{category}</span>
            <div className="mt-2 line-clamp-2 text-[15px] font-semibold leading-snug">
              {tpl.heroTitle[lang] ?? tpl.heroTitle.en}
            </div>
            <span className="btn-solid mt-3 inline-flex !min-h-8 !px-3 !py-1 !text-[12px]">
              {cta}
            </span>
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between gap-2 p-4">
        <div>
          <div className="text-[15px] font-semibold text-ink">{name}</div>
          <div className="text-[12px] text-muted">{category}</div>
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-ink-soft transition-colors group-hover:text-accent">
          {tr(lang, "templates.viewPreview")} →
        </span>
      </div>
    </Link>
  );
}
