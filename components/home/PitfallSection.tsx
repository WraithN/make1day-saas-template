import { Trans } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n-core";

// Asymmetric grid (7/5/5/7) — deliberately NOT equal-width cards. Each card is a
// concrete launch pit ShipKit helps you avoid, written for devs who've been burned.
const ITEMS: { i: number; span: string }[] = [
  { i: 1, span: "lg:col-span-7" },
  { i: 2, span: "lg:col-span-5" },
  { i: 3, span: "lg:col-span-5" },
  { i: 4, span: "lg:col-span-7" },
];

export function PitfallSection({ lang }: { lang: Lang }) {
  return (
    <section className="sk-font wrap py-14 sm:py-20">
      <p className="eyebrow mb-3">
        <Trans k="pitfall.eyebrow" lang={lang} />
      </p>
      <h2 className="max-w-3xl text-[18px] font-medium text-[#f0f0f0]">
        <Trans k="pitfall.title" lang={lang} />
      </h2>
      <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-[#949494]">
        <Trans k="pitfall.intro" lang={lang} />
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
        {ITEMS.map(({ i, span }) => (
          <article
            key={i}
            className={`card border-l-2 border-l-accent/60 border-line ${span}`}
          >
            <span className="chip text-[11px] text-accent">
              <Trans k={`pitfall.${i}.tag`} lang={lang} />
            </span>
            <h3 className="mt-3 text-[14px] font-medium text-[#f0f0f0]">
              <Trans k={`pitfall.${i}.t`} lang={lang} />
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-[#949494]">
              <Trans k={`pitfall.${i}.d`} lang={lang} />
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
