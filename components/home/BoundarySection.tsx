import { Trans } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n-core";

const CAPS = [1, 2, 3, 4] as const;
const LIMS = [1, 2, 3, 4] as const;

// The honesty anchor of the whole page: a collapsible capability / boundary
// contrast. "Stable today" is bright and open; "Known limits" is dimmed and
// collapsed — ShipKit's transparency made visible, not a flat feature list.
export function BoundarySection({ lang }: { lang: Lang }) {
  return (
    <section id="boundaries" className="sk-font wrap py-14 sm:py-20">
      <p className="eyebrow mb-3">
        <Trans k="boundary.eyebrow" lang={lang} />
      </p>
      <h2 className="max-w-3xl text-[18px] font-medium leading-snug text-[#f0f0f0]">
        <Trans k="boundary.title" lang={lang} />
      </h2>
      <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-[#949494]">
        <Trans k="boundary.intro" lang={lang} />
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <p className="eyebrow mb-3 text-accent">
            <Trans k="boundary.capLabel" lang={lang} />
          </p>
          <div className="space-y-3">
            {CAPS.map((i) => (
              <details key={i} className="card border-accent/40" open>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[14px] font-medium text-[#f0f0f0]">
                  <span>
                    <Trans k={`boundary.cap${i}.t`} lang={lang} />
                  </span>
                  <span className="text-[#666666]">▾</span>
                </summary>
                <p className="mt-2 text-[14px] leading-relaxed text-[#949494]">
                  <Trans k={`boundary.cap${i}.d`} lang={lang} />
                </p>
              </details>
            ))}
          </div>
        </div>

        <div>
          <p className="eyebrow mb-3 text-[#949494]">
            <Trans k="boundary.limLabel" lang={lang} />
          </p>
          <div className="space-y-3">
            {LIMS.map((i) => (
              <details key={i} className="card border-line">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[14px] font-medium text-[#c4c4c4]">
                  <span>
                    <Trans k={`boundary.lim${i}.t`} lang={lang} />
                  </span>
                  <span className="text-[#666666]">▾</span>
                </summary>
                <p className="mt-2 text-[14px] leading-relaxed text-[#949494]">
                  <Trans k={`boundary.lim${i}.d`} lang={lang} />
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
