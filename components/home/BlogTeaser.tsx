import Link from "next/link";
import { Trans } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n-core";
import { getAllPosts } from "@/lib/content/blog";

// Blog teaser: tutorial-type posts get the teal tag; competitor-comparison
// posts get the brick tag. Cards are equal-height (grid stretch + h-full) so
// the three columns line up, and rotate through the highlighter palette.
const TONES = ["card-mint", "card-cream", "card-pink"];

export function BlogTeaser({ lang }: { lang: Lang }) {
  const posts = getAllPosts().slice(0, 3);
  return (
    <section className="sk-font wrap py-14 sm:py-20">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">
            <Trans k="homeBlog.eyebrow" lang={lang} />
          </p>
          <h2 className="text-[18px] font-semibold text-ink">
            <Trans k="homeBlog.title" lang={lang} />
          </h2>
        </div>
        <Link
          href="/blog"
          className="text-[14px] font-bold text-accent hover:underline"
        >
          <Trans k="homeBlog.viewAll" lang={lang} />
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p, idx) => {
          const isCompare = p.category === "Comparison";
          return (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className={`card flex h-full flex-col ${TONES[idx % TONES.length]}`}
            >
              <span
                className={`chip w-fit text-[11px] ${
                  isCompare
                    ? "text-accent"
                    : "text-accent2"
                }`}
              >
                {p.category}
              </span>
              <h3 className="mt-3 text-[14px] font-bold leading-snug text-ink">
                {p.title[lang] ?? p.title.en}
              </h3>
              <p className="mt-2 flex-1 text-[14px] leading-relaxed text-ink-soft">
                {p.excerpt[lang] ?? p.excerpt.en}
              </p>
              <p className="mt-auto pt-4 text-[12px] text-muted">
                {p.date} · {p.readingMinutes} min
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
