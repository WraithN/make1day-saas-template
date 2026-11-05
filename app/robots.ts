import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://shipkit.dev";

export default function robots(): MetadataRoute.Robots {
  return {
    // Machine-readable routes are explicitly named so agents/answer engines
    // discover them even when a crawler only inspects the robots file.
    // /builder is the product's main conversion page — it must be crawlable.
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/builder",
          "/agent-ready",
          "/llms.txt",
          "/llms-full.txt",
          "/openapi.json",
          "/api/mcp",
        ],
        // /account (user console) and /admin (operator console) are private
        // areas — never index them, even though they are noindex pages.
        disallow: ["/dashboard", "/account", "/admin", "/api/", "/auth/"],
      },
      {
        // Explicit AI / answer-engine crawlers (GEO).
        userAgent: [
          "GPTBot",
          "ClaudeBot",
          "PerplexityBot",
          "Google-Extended",
          "Applebot-Extended",
          "CCBot",
          "Bytespider",
        ],
        allow: [
          "/",
          "/builder",
          "/agent-ready",
          "/llms.txt",
          "/llms-full.txt",
          "/openapi.json",
          "/api/mcp",
        ],
        // /account (user console) and /admin (operator console) are private
        // areas — never index them, even though they are noindex pages.
        disallow: ["/dashboard", "/account", "/admin", "/api/", "/auth/"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
