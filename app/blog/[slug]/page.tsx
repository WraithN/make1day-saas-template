import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLang, tr } from "@/lib/i18n-server";
import {
  allPostSlugs,
  getPost,
  postFaq,
  postField,
  postContentLang,
  relatedPosts,
} from "@/lib/content/blog";
import { Markdown } from "@/lib/markdown";

// Keep this literal stable: the generator rewrites it to localhost inside
// customer ZIPs. Set NEXT_PUBLIC_SITE_URL to the real domain at launch.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://make1day.com";
const COMPANY = "make1day";

/** Canonical slugs AND legacy aliases resolve to a static page. */
export function generateStaticParams() {
  return allPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const title = postField(post, "en", "title");
  const description = postField(post, "en", "excerpt");
  return {
    title,
    description,
    keywords: post.tags,
    authors: [{ name: COMPANY }],
    alternates: {
      canonical: `/blog/${post.slug}`,
      languages: {
        en: `/blog/${post.slug}`,
        "zh-CN": `/blog/${post.slug}?lang=zh`,
        ja: `/blog/${post.slug}?lang=ja`,
        fr: `/blog/${post.slug}?lang=fr`,
        de: `/blog/${post.slug}?lang=de`,
      },
      // Machine-readable variant for AI crawlers / answer engines (GEO).
      types: { "text/markdown": `/blog/${post.slug}/md` },
    },
    openGraph: {
      type: "article",
      title,
      description,
      url: `${SITE_URL}/blog/${post.slug}`,
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      authors: [COMPANY],
      siteName: COMPANY,
    },
  };
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  const lang = await getLang();
  const body = postField(post, lang, "body");
  const faq = postFaq(post, lang);
  // Titles may be localised while the body falls back to English; JSON-LD
  // must describe the language of the text, not the UI locale.
  const contentLang = postContentLang(post, lang);
  const canonical = `${SITE_URL}/blog/${post.slug}`;
  const related = relatedPosts(post, 3);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: postField(post, lang, "title"),
    description: postField(post, lang, "excerpt"),
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    author: { "@type": "Organization", name: COMPANY, url: SITE_URL },
    publisher: { "@type": "Organization", name: COMPANY, url: SITE_URL },
    articleSection: post.category,
    keywords: post.tags.join(", "),
    inLanguage: contentLang,
    isAccessibleForFree: true,
    mainEntityOfPage: canonical,
    url: canonical,
  };

  // One structured Q&A graph per article. This is the surface answer engines
  // quote — it is built from the SAME data as the visible FAQ section below.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: contentLang,
    mainEntity: faq.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      {
        "@type": "ListItem",
        position: 3,
        name: postField(post, lang, "title"),
        item: canonical,
      },
    ],
  };

  return (
    <article className="wrap max-w-3xl py-12 sm:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Link href="/blog" className="text-sm text-accent">
        ← {tr(lang, "blog.back")}
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted">
        <span className="rounded-full bg-accent/10 px-2 py-1 text-accent">
          {post.category}
        </span>
        <span>
          {tr(lang, "blog.published")} {post.date}
        </span>
        <span>· {post.readingMinutes} {tr(lang, "blog.minRead")}</span>
      </div>

      <h1 className="mt-3 text-4xl font-semibold leading-tight">
        {postField(post, lang, "title")}
      </h1>

      {/* Company byline — the same Organization name used in every JSON-LD
          author/publisher field, so search and answer engines see one entity. */}
      <p className="mt-3 text-sm text-muted">
        By <span className="font-semibold text-ink">{COMPANY}</span>
        {post.updated ? ` · Updated ${post.updated}` : ""}
      </p>

      <div className="mt-6 text-[15px]">
        {body ? <Markdown source={body} /> : null}
      </div>

      {faq.length > 0 && (
        <section className="mt-12" aria-labelledby="post-faq">
          <h2 id="post-faq" className="text-2xl font-semibold">
            FAQ
          </h2>
          <div className="mt-5 space-y-3">
            {faq.map((it, i) => (
              <details
                key={i}
                className="card group cursor-pointer [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex items-center justify-between gap-3 font-medium">
                  <span>{it.q}</span>
                  <span className="ml-2 shrink-0 text-accent transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <div className="mt-3 text-sm leading-relaxed text-ink-soft">
                  <Markdown source={it.a} />
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <nav className="mt-12 border-t border-line pt-8" aria-label="Related articles">
        <h2 className="text-lg font-semibold">More from {COMPANY}</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {related.map((p) => (
            <li key={p.slug}>
              <Link href={`/blog/${p.slug}`} className="text-accent hover:underline">
                {postField(p, lang, "title")}
              </Link>
              <span className="ml-2 text-muted">· {p.category}</span>
            </li>
          ))}
        </ul>
      </nav>

      <p className="mt-8 text-xs text-muted">
        <Link href="/faq" className="text-accent hover:underline">
          All frequently asked questions
        </Link>
        {" · "}
        <a href={`/blog/${post.slug}/md`} className="text-accent hover:underline">
          Markdown version (for AI agents)
        </a>
      </p>
    </article>
  );
}
