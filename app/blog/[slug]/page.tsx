import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLang, tr } from "@/lib/i18n-server";
import { getAllPosts, getPost, postField } from "@/lib/content/blog";
import { Markdown } from "@/lib/markdown";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://shipkit.dev";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: postField(post, "en", "title"),
    description: postField(post, "en", "excerpt"),
    keywords: post.tags,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: postField(post, "en", "title"),
      description: postField(post, "en", "excerpt"),
      url: `${SITE_URL}/blog/${post.slug}`,
      publishedTime: post.date,
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: postField(post, lang, "title"),
    description: postField(post, lang, "excerpt"),
    datePublished: post.date,
    author: { "@type": "Organization", name: "Uncorne" },
    publisher: { "@type": "Organization", name: "Uncorne" },
    inLanguage: lang,
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  };

  return (
    <article className="wrap max-w-3xl py-12 sm:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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

      <div className="mt-6 text-[15px]">
        {body ? <Markdown source={body} /> : null}
      </div>
    </article>
  );
}
