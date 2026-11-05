import type { Metadata } from "next";
import Link from "next/link";
import { getLang, tr } from "@/lib/i18n-server";
import { getAllPosts, postField } from "@/lib/content/blog";

export const metadata: Metadata = {
  title: "Blog — ShipKit AI SaaS starter",
  description:
    "Practical guides on building, billing and launching a SaaS with Next.js: how to build a SaaS with Next.js, Next.js SaaS boilerplate with Stripe and auth, subscription billing, and alternatives compared.",
  keywords: [
    "how to build a SaaS with Next.js",
    "Next.js SaaS boilerplate with Stripe and auth",
    "Next.js SaaS starter with auth",
    "Next.js subscription billing boilerplate",
    "ShipFast alternative",
    "Best Next.js SaaS boilerplate 2026",
  ],
};

export default async function BlogIndex() {
  const lang = await getLang();
  const posts = getAllPosts();

  return (
    <section className="wrap py-12 sm:py-20">
      <div className="text-center">
        <div className="eyebrow mb-3">{tr(lang, "blog.eyebrow")}</div>
        <h1 className="text-3xl font-semibold sm:text-4xl">{tr(lang, "blog.heading")}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-ink-soft">
          {tr(lang, "blog.subtitle")}
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`/blog/${p.slug}`}
            className="card block p-6 transition hover:border-accent/50"
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
            <p className="mt-2 text-sm text-ink-soft">
              {postField(p, lang, "excerpt")}
            </p>
            <span className="mt-4 inline-block text-accent">
              {tr(lang, "blog.readMore")} →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
