import Link from "next/link";
import { Trans } from "@/lib/i18n";
import { tr } from "@/lib/i18n-server";
import type { Lang } from "@/lib/i18n-core";
import { TEMPLATES } from "@/lib/content/templates";
import { TemplateCard } from "@/components/TemplateCard";

export function TemplateGallerySection({
  lang,
  withCta = true,
}: {
  lang: Lang;
  withCta?: boolean;
}) {
  return (
    <section className="sk-font wrap py-14 sm:py-20">
      <div className="text-center">
        <div className="eyebrow mb-3">
          <Trans k="templates.eyebrow" lang={lang} />
        </div>
        <h2 className="text-[20px] font-semibold text-ink sm:text-[24px]">
          <Trans k="templates.title" lang={lang} />
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-[14px] leading-relaxed text-muted">
          <Trans k="templates.subtitle" lang={lang} />
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((tpl) => (
          <TemplateCard key={tpl.slug} tpl={tpl} lang={lang} />
        ))}
      </div>

      {withCta && (
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/templates" className="btn-solid text-[15px]">
            {tr(lang, "nav.templates")}
          </Link>
          <Link href="/builder" className="btn-ghost text-[15px]">
            <Trans k="templates.ctaGenerator" lang={lang} />
          </Link>
        </div>
      )}
    </section>
  );
}
