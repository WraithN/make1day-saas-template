import type { Metadata } from "next";
import Link from "next/link";
import { getLang, tr } from "@/lib/i18n-server";
import { getAllPosts, postField } from "@/lib/content/blog";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://make1day.com";
const COMPANY = "make1day";

export const metadata: Metadata = {
  title: "Blog — make1day AI SaaS starter guides",
  description:
    "Practical, verified guides on building, billing and launching an AI SaaS with Next.js: subscription webhooks, payment gateways, white-label source delivery, the 2026 AI boilerplate checklist and agent-readable docs.",
  keywords: [
    "how to build a SaaS with Next.js",
    "Next.js SaaS boilerplate with Stripe and auth",
    "Next.js subscription billing boilerplate",
    "AI SaaS boilerplate checklist 2026",
    "white label SaaS boilerplate",
    "AGENTS.md boilerplate",
    "ShipFast alternative",
    "best Next.js SaaS boilerplate 2026",
  ],
  alternates: { canonical: "/blog" },
};

export default async function BlogIndex() {
  const lang = await getLang();
  const posts = getAllPosts();
  const categories = [...new Set(posts.map((p) => p.category))].sort();

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${COMPANY} Blog`,
    description: metadata.description,
    url: `${SITE_URL}/blog`,
    inLanguage: lang,
    publisher: { "@type": "Organization", name: COMPANY, url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: posts.length,
      itemListElement: posts.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: postField(p, lang, "title"),
        url: `${SITE_URL}/blog/${p.slug}`,
      })),
    },
  };

  return (
    <section className="wrap py-12 sm:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <div className="text-center">
        <div className="eyebrow mb-3">{tr(lang, "blog.eyebrow")}</div>
        <h1 className="text-3xl font-semibold sm:text-4xl">{tr(lang, "blog.heading")}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-ink-soft">
          {tr(lang, "blog.subtitle")}
        </p>
        <p className="mt-2 text-xs text-muted">
          Published by <span className="font-semibold text-ink">{COMPANY}</span> · every article
          ships a visible FAQ and machine-readable FAQPage data.
        </p>
      </div>

      <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2">
        {categories.map((c) => (
          <span key={c} className="chip text-[11px]">
            {c} · {posts.filter((p) => p.category === c).length}
          </span>
        ))}
      </div>

      <Link
        href="/faq"
        className="card card-mint mx-auto mt-8 block max-w-3xl border-accent/40 transition hover:border-accent"
      >
        <span className="chip text-[11px] text-accent">FAQ</span>
        <h2 className="mt-3 text-lg font-semibold">
          Looking for a direct answer instead?
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Licensing, payments, white-labelling, AI quotas, refunds and honest limitations —
          all in one structured FAQ page.
        </p>
        <span className="mt-3 inline-block text-sm font-bold text-accent">
          Browse all FAQ →
        </span>
      </Link>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`/blog/${p.slug}`}
            className="card flex h-full flex-col p-6 transition hover:border-accent/50"
          >
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
              <span className="rounded-full bg-accent/10 px-2 py-1 text-accent">
                {p.category}
              </span>
              <span>{p.date}</span>
              <span>· {p.readingMinutes} {tr(lang, "blog.minRead")}</span>
            </div>
            <h2 className="mt-3 text-xl font-semibold">
              {postField(p, lang, "title")}
            </h2>
            <p className="mt-2 flex-1 text-sm text-ink-soft">
              {postField(p, lang, "excerpt")}
            </p>
            <p className="mt-3 text-[11px] text-muted">
              {p.tags.slice(0, 2).join(" · ")}
            </p>
            <span className="mt-3 inline-block text-accent">
              {tr(lang, "blog.readMore")} →
            </span>
          </Link>
        ))}
      </div>

      <nav className="mt-12 flex flex-wrap justify-center gap-6 text-sm" aria-label="Related pages">
        <Link href="/compare" className="text-accent hover:underline">
          Compare starters
        </Link>
        <Link href="/agent-ready" className="text-accent hover:underline">
          Agent-ready docs
        </Link>
        <Link href="/pricing" className="text-accent hover:underline">
          Pricing
        </Link>
      </nav>
    </section>
  );
}
