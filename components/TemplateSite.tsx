import Link from "next/link";
import { tr } from "@/lib/i18n-server";
import type { Lang } from "@/lib/i18n-core";
import { themeVars, textureStyle } from "@/lib/generator/themes";
import type { TemplateMeta } from "@/lib/content/templates";

// Renders a believable marketing site generated from a template, using that
// template's REAL theme variables (no screenshot). Used by the /templates
// preview pages and the homepage gallery thumbnails.
export function TemplateSite({
  tpl,
  lang,
}: {
  tpl: TemplateMeta;
  lang: Lang;
}) {
  const wrapStyle = {
    ...themeVars(tpl.styleId),
    backgroundColor: "rgb(var(--bg))",
    color: "rgb(var(--ink))",
  } as React.CSSProperties;

  const name = tpl.name[lang] ?? tpl.name.en;
  const category = tpl.category[lang] ?? tpl.category.en;
  const cta = tpl.primaryCta[lang] ?? tpl.primaryCta.en;

  return (
    <div
      className="ts-site relative overflow-hidden"
      style={wrapStyle}
    >
      {/* Decorative theme texture (transparent base over the bg colour). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={textureStyle(tpl.styleId)}
      />

      <div className="wrap relative z-10 py-5">
        {/* Mini nav */}
        <nav className="flex items-center justify-between gap-3">
          <span className="text-[15px] font-bold tracking-tight">{name}</span>
          <div className="flex items-center gap-4 text-[13px] text-[rgb(var(--ink-soft))]">
            <a href="#features" className="hidden sm:inline hover:text-[rgb(var(--accent))]">{tr(lang, "templates.features")}</a>
            <a href="#pricing" className="hidden sm:inline hover:text-[rgb(var(--accent))]">{tr(lang, "templates.pricing")}</a>
            <Link
              href="/builder"
              className="btn-solid !min-h-9 !px-3 !py-1.5 !text-[13px]"
            >
              {cta}
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <header className="py-12 text-center sm:py-16">
          <span className="tag">{category}</span>
          <h1 className="mx-auto mt-4 max-w-2xl text-[28px] font-bold leading-tight sm:text-[40px]">
            {tpl.heroTitle[lang] ?? tpl.heroTitle.en}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[14px] leading-relaxed text-[rgb(var(--ink-soft))] sm:text-[15px]">
            {tpl.heroSubtitle[lang] ?? tpl.heroSubtitle.en}
          </p>
          <div className="mt-7 flex justify-center">
            <Link href="/builder" className="btn-solid text-[15px]">
              {cta}
            </Link>
          </div>
        </header>

        {/* Features */}
        <section id="features" className="py-10">
          <h2 className="text-[20px] font-semibold">
            {tr(lang, "templates.features")}
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {tpl.features.map((f, i) => (
              <div key={i} className="card">
                <div className="text-[15px] font-semibold">
                  {f[lang] ?? f.en}
                </div>
                <div className="mt-2 h-1 w-10 rounded-full bg-[rgb(var(--accent))]" />
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-10">
          <h2 className="text-[20px] font-semibold">
            {tr(lang, "templates.pricing")}
          </h2>
          <div className="mt-5 max-w-sm card">
            <div className="text-[13px] uppercase tracking-wide text-[rgb(var(--muted))]">
              {tpl.pricingLabel[lang] ?? tpl.pricingLabel.en}
            </div>
            <div className="mt-1 text-[34px] font-bold">
              {tpl.pricingPrice}
            </div>
            <Link
              href="/builder"
              className="btn-solid mt-4 w-full text-[15px]"
            >
              {cta}
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[rgb(var(--line))] py-6 text-[13px] text-[rgb(var(--muted))]">
          © {name}
        </footer>
      </div>
    </div>
  );
}
