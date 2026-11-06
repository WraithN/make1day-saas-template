import Link from "next/link";
import { Trans } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n-core";
import { getAllPosts } from "@/lib/content/blog";

// Blog teaser: tutorial-type posts (Guide/Tutorial/Billing) get the teal tag;
// competitor-comparison posts get the blue tag — distinct colors per the brief.
// Cards are items-start so their natural height differences show (not equal).
export function BlogTeaser({ lang }: { lang: Lang }) {
  const posts = getAllPosts().slice(0, 3);
  return (
    <section className="sk-font wrap py-14 sm:py-20">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">
            <Trans k="homeBlog.eyebrow" lang={lang} />
          </p>
          <h2 className="text-[18px] font-medium text-[#f0f0f0]">
            <Trans k="homeBlog.title" lang={lang} />
          </h2>
        </div>
        <Link
          href="/blog"
          className="text-[14px] text-accent hover:underline"
        >
          <Trans k="homeBlog.viewAll" lang={lang} />
        </Link>
      </div>

      <div className="mt-8 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => {
          const isCompare = p.category === "Comparison";
          return (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="card flex flex-col hover:border-accent/50"
            >
              <span
                className={`chip w-fit text-[11px] ${
                  isCompare
                    ? "border-accent2/50 text-accent2"
                    : "border-accent/50 text-accent"
                }`}
              >
                {p.category}
              </span>
              <h3 className="mt-3 text-[14px] font-medium leading-snug text-[#f0f0f0]">
                {p.title[lang] ?? p.title.en}
              </h3>
              <p className="mt-2 flex-1 text-[14px] leading-relaxed text-[#949494]">
                {p.excerpt[lang] ?? p.excerpt.en}
              </p>
              <p className="mt-4 text-[12px] text-[#666666]">
                {p.date} · {p.readingMinutes} min
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
