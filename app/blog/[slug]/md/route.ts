import { type NextRequest } from "next/server";
import {
  buildPostMarkdown,
  getPost,
  postContentLang,
} from "@/lib/content/blog";
import type { Lang } from "@/lib/i18n-core";

/**
 * Markdown variant of every article — a GEO surface for crawlers and answer
 * engines that would rather read plain text than render a React page.
 * Linked from each article via metadata alternates.types and a visible link.
 *
 * Dynamic by design: ?lang=zh|ja|fr|de selects a translation, with English
 * as the default. No cookies, so the response stays cacheable. The shared
 * renderer is also used by the `?format=md` page variant.
 */
export const dynamic = "force-dynamic";

const LANGS: readonly string[] = ["en", "zh", "ja", "fr", "de"];
const COMPANY = "make1day.dev";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const post = getPost(slug);
  const notFound = (body: string) =>
    new Response(body, {
      status: 404,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "X-Robots-Tag": "noindex",
      },
    });
  if (!post) return notFound("# Not found\n");

  const raw = req.nextUrl.searchParams.get("lang") ?? "en";
  const lang: Lang = (LANGS.includes(raw) ? raw : "en") as Lang;
  const contentLang = postContentLang(post, lang);

  return new Response(buildPostMarkdown(post, lang, COMPANY), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Language": contentLang,
      "Cache-Control": "public, max-age=3600",
      // GEO surface for AI crawlers, not a search-result page: keep it out
      // of Google's index and out of the sitemap to avoid duplicating the
      // HTML article.
      "X-Robots-Tag": "noindex",
    },
  });
}
