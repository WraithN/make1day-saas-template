import { Trans } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n-core";

// Equal-width 2x2 grid. The old 7/5/5/7 spans made the cards look mismatched;
// alternating highlighter blocks still give the C-graded rhythm.
const ITEMS: { i: number; tone: string }[] = [
  { i: 1, tone: "card-cream" },
  { i: 2, tone: "card-pink" },
  { i: 3, tone: "card-mint" },
  { i: 4, tone: "" },
];

export function PitfallSection({ lang }: { lang: Lang }) {
  return (
    <section className="sk-font wrap py-14 sm:py-20">
      <p className="eyebrow mb-3">
        <Trans k="pitfall.eyebrow" lang={lang} />
      </p>
      <h2 className="max-w-3xl text-[18px] font-semibold text-ink">
        <Trans k="pitfall.title" lang={lang} />
      </h2>
      <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted">
        <Trans k="pitfall.intro" lang={lang} />
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {ITEMS.map(({ i, tone }) => (
          <article
            key={i}
            className={`card border-l-2 border-l-accent/60 ${tone}`}
          >
            <span className="chip text-[11px] text-accent">
              <Trans k={`pitfall.${i}.tag`} lang={lang} />
            </span>
            <h3 className="mt-3 text-[14px] font-bold text-ink">
              <Trans k={`pitfall.${i}.t`} lang={lang} />
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
              <Trans k={`pitfall.${i}.d`} lang={lang} />
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
