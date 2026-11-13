import { Trans } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n-core";

// Equal-width 2x2 grid. The old 6/6/7/5 asymmetric spans made the second row
// visibly wider on one side; a uniform grid keeps the highlighter blocks in a
// clean rectangle at every breakpoint.
const LEADS: { i: number; tone: string }[] = [
  { i: 1, tone: "card-mint" },
  { i: 2, tone: "card-cream" },
  { i: 3, tone: "card-pink" },
  { i: 4, tone: "" },
  { i: 5, tone: "card-mint" },
  { i: 6, tone: "card-cream" },
];

export function FeatureMatrix({ lang }: { lang: Lang }) {
  return (
    <section className="sk-font wrap py-14 sm:py-20">
      <p className="eyebrow mb-3">
        <Trans k="matrix.eyebrow" lang={lang} />
      </p>
      <h2 className="max-w-3xl text-[18px] font-semibold text-ink">
        <Trans k="matrix.title" lang={lang} />
      </h2>
      <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted">
        <Trans k="matrix.intro" lang={lang} />
      </p>

      <p className="mb-3 mt-8 text-[12px] font-bold uppercase tracking-wider text-accent">
        <Trans k="matrix.leadLabel" lang={lang} />
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {LEADS.map(({ i, tone }) => (
          <div key={i} className={`card border-accent/40 ${tone}`}>
            <h3 className="text-[14px] font-bold text-ink">
              <Trans k={`matrix.lead${i}.t`} lang={lang} />
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
              <Trans k={`matrix.lead${i}.d`} lang={lang} />
            </p>
          </div>
        ))}
      </div>

      <p className="mb-3 mt-8 text-[12px] font-bold uppercase tracking-wider text-muted">
        <Trans k="matrix.stdLabel" lang={lang} />
      </p>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className="chip text-[12px]">
            <Trans k={`matrix.std${i}`} lang={lang} />
          </span>
        ))}
      </div>

      <p className="mt-6 max-w-2xl text-[12px] leading-relaxed text-muted">
        <Trans k="matrix.note" lang={lang} />
      </p>
    </section>
  );
}
