import { Trans } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n-core";

// Differentiators are enlarged (6/6/7/5 asymmetric) and accent-bordered; the
// commodity SaaS features are collapsed into a muted footnote strip — they are
// the entry ticket, not the product.
const LEADS: { i: number; span: string }[] = [
  { i: 1, span: "lg:col-span-6" },
  { i: 2, span: "lg:col-span-6" },
  { i: 3, span: "lg:col-span-7" },
  { i: 4, span: "lg:col-span-5" },
];

export function FeatureMatrix({ lang }: { lang: Lang }) {
  return (
    <section className="sk-font wrap py-14 sm:py-20">
      <p className="eyebrow mb-3">
        <Trans k="matrix.eyebrow" lang={lang} />
      </p>
      <h2 className="max-w-3xl text-[18px] font-medium text-[#f0f0f0]">
        <Trans k="matrix.title" lang={lang} />
      </h2>
      <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-[#949494]">
        <Trans k="matrix.intro" lang={lang} />
      </p>

      <p className="mb-3 mt-8 text-[12px] font-medium uppercase tracking-wider text-accent">
        <Trans k="matrix.leadLabel" lang={lang} />
      </p>
      <div className="grid gap-4 lg:grid-cols-12">
        {LEADS.map(({ i, span }) => (
          <div
            key={i}
            className={`card border-accent/40 ${span}`}
          >
            <h3 className="text-[14px] font-medium text-[#f0f0f0]">
              <Trans k={`matrix.lead${i}.t`} lang={lang} />
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-[#949494]">
              <Trans k={`matrix.lead${i}.d`} lang={lang} />
            </p>
          </div>
        ))}
      </div>

      <p className="mb-3 mt-8 text-[12px] font-medium uppercase tracking-wider text-[#949494]">
        <Trans k="matrix.stdLabel" lang={lang} />
      </p>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="chip text-[12px] text-[#949494]"
          >
            <Trans k={`matrix.std${i}`} lang={lang} />
          </span>
        ))}
      </div>

      <p className="mt-6 max-w-2xl text-[12px] leading-relaxed text-[#666666]">
        <Trans k="matrix.note" lang={lang} />
      </p>
    </section>
  );
}
