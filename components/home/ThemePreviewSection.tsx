import Link from "next/link";
import { Trans } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n-core";

// The unique engineering value: this starter exports reusable design assets
// (CSS tokens + a design.md spec), not a locked-in hardcoded theme. The right
// column shows the actual exported artifact — not a screenshot of a UI.
export function ThemePreviewSection({ lang }: { lang: Lang }) {
  return (
    <section className="sk-font wrap py-14 sm:py-20">
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <div>
          <p className="eyebrow mb-3">
            <Trans k="theme.eyebrow" lang={lang} />
          </p>
          <h2 className="max-w-xl text-[18px] font-semibold text-ink">
            <Trans k="theme.title" lang={lang} />
          </h2>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted">
            <Trans k="theme.body" lang={lang} />
          </p>

          <dl className="mt-6 space-y-4">
            <div className="border-l-4 border-l-accent pl-3">
              <dt className="text-[14px] font-bold text-ink">
                <Trans k="theme.tokenTitle" lang={lang} />
              </dt>
              <dd className="mt-1 text-[14px] leading-relaxed text-ink-soft">
                <Trans k="theme.tokenBody" lang={lang} />
              </dd>
            </div>
            <div className="border-l-4 border-l-accent pl-3">
              <dt className="text-[14px] font-bold text-ink">
                <Trans k="theme.designmdTitle" lang={lang} />
              </dt>
              <dd className="mt-1 text-[14px] leading-relaxed text-ink-soft">
                <Trans k="theme.designmdBody" lang={lang} />
              </dd>
            </div>
          </dl>

          <Link
            href="/builder"
            className="btn-ghost mt-6 inline-flex text-[16px]"
          >
            <Trans k="theme.cta" lang={lang} />
          </Link>
        </div>

        <div className="space-y-3">
          <div className="card card-cream font-mono text-[12px] leading-relaxed text-ink-soft">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink">
              :root — design tokens
            </p>
            <pre className="whitespace-pre-wrap">
              {"--bg: 255 248 231;\n--surface: 255 255 255;\n--accent: 201 80 58;\n--ink: 17 17 17;\n--line: 96 88 72;"}
            </pre>
          </div>
          <div className="card card-mint">
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink">
              design.md
            </p>
            <p className="mt-2 text-[14px] text-ink">
              <Trans k="theme.previewCaption" lang={lang} />
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
              # Tokens · # Spacing · # Type scale · # Component conventions
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
