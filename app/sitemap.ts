import type { MetadataRoute } from "next";
import { POSTS } from "@/lib/content/blog";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://make1day.com";
const LANGS = ["en", "zh", "ja", "fr", "de"];

/**
 * hreflang cluster for one logical page: every language variant (plus
 * x-default → EN) cross-references the others. Emitted as xhtml:link
 * alternates in the sitemap, which covers pages whose HTML head does not
 * carry alternates and keeps the cluster definition in exactly one place.
 */
function langSet(path: string) {
  const href = (l: string) =>
    l === "en" ? `${BASE}${path || "/"}` : `${BASE}${path || "/"}?lang=${l}`;
  const languages: Record<string, string> = {};
  for (const l of LANGS) languages[l] = href(l);
  languages["x-default"] = href("en");
  return { languages };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Indexable marketing + legal pages.
  const routes: { path: string; priority: number }[] = [
    { path: "", priority: 1 },
    { path: "/builder", priority: 0.9 },
    { path: "/pricing", priority: 0.8 },
    { path: "/support", priority: 0.5 },
    { path: "/faq", priority: 0.7 },
    { path: "/compare", priority: 0.7 },
    { path: "/styles", priority: 0.7 },
    { path: "/templates", priority: 0.6 },
    { path: "/blog", priority: 0.6 },
    { path: "/privacy", priority: 0.4 },
    { path: "/terms", priority: 0.4 },
  ];

  const entries: MetadataRoute.Sitemap = [];

  // Per-route entries, plus a localized variant for each language so crawlers
  // discover every language without executing JS.
  for (const r of routes) {
    entries.push({
      url: `${BASE}${r.path}`,
      lastModified: now,
      changeFrequency: r.path === "" ? "weekly" : "monthly",
      priority: r.priority,
      alternates: langSet(r.path),
    });
    for (const l of LANGS) {
      if (l === "en") continue;
      entries.push({
        url: `${BASE}${r.path || "/"}?lang=${l}`,
        lastModified: now,
        changeFrequency: r.path === "" ? "weekly" : "monthly",
        priority: r.priority - 0.1,
        alternates: langSet(r.path),
      });
    }
  }

  // Blog posts (canonical slugs ONLY). Legacy aliases still resolve as static
  // pages with a canonical pointing at the current slug; listing them here as
  // well would send duplicate-content signals, so they are intentionally absent.
  for (const post of POSTS) {
    const path = `/blog/${post.slug}`;
    const modified = new Date(post.updated ?? post.date);
    entries.push({
      url: `${BASE}${path}`,
      lastModified: modified,
      changeFrequency: "monthly",
      priority: 0.6,
      alternates: langSet(path),
    });
    for (const l of LANGS) {
      if (l === "en") continue;
      entries.push({
        url: `${BASE}${path}?lang=${l}`,
        lastModified: modified,
        changeFrequency: "monthly",
        priority: 0.5,
        alternates: langSet(path),
      });
    }

    // Markdown variants are a separate, agent-readable surface. They are
    // linked from each article's metadata alternates and footer, and are
    // explicitly allowed in robots.txt for both generic and AI crawlers.
    const mdPath = `${path}/md`;
    entries.push({
      url: `${BASE}${mdPath}`,
      lastModified: modified,
      changeFrequency: "monthly",
      priority: 0.4,
      alternates: langSet(mdPath),
    });
    for (const l of LANGS) {
      if (l === "en") continue;
      entries.push({
        url: `${BASE}${mdPath}?lang=${l}`,
        lastModified: modified,
        changeFrequency: "monthly",
        priority: 0.3,
        alternates: langSet(mdPath),
      });
    }
  }

  // Machine-readable endpoints for AI agents / answer engines. These are not
  // marketing pages, but listing them helps discovery (see docs/agent-discovery.md).
  for (const path of [
    "/llms.txt",
    "/llms-full.txt",
    "/openapi.json",
    "/api/mcp",
    "/.well-known/agent-card.json",
  ]) {
    entries.push({
      url: `${BASE}${path}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.3,
    });
  }

  return entries;
}
