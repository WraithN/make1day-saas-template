import type { MetadataRoute } from "next";
import { POSTS } from "@/lib/content/blog";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://shipkit.dev";
const LANGS = ["en", "zh", "ja", "fr"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Indexable marketing + legal pages.
  const routes: { path: string; priority: number }[] = [
    { path: "", priority: 1 },
    { path: "/builder", priority: 0.9 },
    { path: "/pricing", priority: 0.8 },
    { path: "/faq", priority: 0.7 },
    { path: "/compare", priority: 0.7 },
    { path: "/agent-ready", priority: 0.7 },
    { path: "/styles", priority: 0.7 },
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
    });
    for (const l of LANGS) {
      if (l === "en") continue;
      entries.push({
        url: `${BASE}${r.path || "/"}?lang=${l}`,
        lastModified: now,
        changeFrequency: r.path === "" ? "weekly" : "monthly",
        priority: r.priority - 0.1,
      });
    }
  }

  // Blog posts (localized variants included).
  for (const post of POSTS) {
    const path = `/blog/${post.slug}`;
    entries.push({
      url: `${BASE}${path}`,
      lastModified: new Date(post.date),
      changeFrequency: "monthly",
      priority: 0.6,
    });
    for (const l of LANGS) {
      if (l === "en") continue;
      entries.push({
        url: `${BASE}${path}?lang=${l}`,
        lastModified: new Date(post.date),
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  }

  // Machine-readable endpoints for AI agents / answer engines. These are not
  // marketing pages, but listing them helps discovery (see docs/agent-discovery.md).
  for (const path of ["/llms.txt", "/llms-full.txt", "/openapi.json"]) {
    entries.push({
      url: `${BASE}${path}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.3,
    });
  }

  return entries;
}
