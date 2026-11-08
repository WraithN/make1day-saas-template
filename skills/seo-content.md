---
name: seo-content
description: Apply make1day's technical SEO and content conventions — metadata, hreflang, sitemap/robots, llms.txt, blog structured data, and long-tail keyword targeting.
---

# Skill: SEO & Content (make1day)

Use this skill when adding pages, blog posts, or improving discoverability in a
make1day project. make1day is built SEO-first — keep it that way.

## Per-page metadata
- Every route exports `metadata` (or `generateMetadata`) with `title`,
  `description`, and `keywords`.
- `metadataBase` is set globally; use relative `alternates.canonical` per page.
- For localized pages, render canonical + hreflang **manually in `<head>`**
  (Next strips `?lang=` from metadata alternates). See `components/SeoLinks.tsx`.

## Multilingual (5 langs: en/zh/ja/fr/de)
- Server content uses `lib/i18n-server` (`getLang`, `tr`).
- Client content uses `useLanguage` + `<Trans k=... />`.
- Language is carried by `?lang=` (crawler-friendly) and the `sk_lang` cookie (return visits).
- Don't split routes per language — use the query param + cookie model.

## Sitemap & robots
- Add every indexable route (and its `/?lang=xx` variants) to `app/sitemap.ts`.
- `app/robots.ts` blocks `/dashboard /api/ /auth/ /builder`; explicitly allows AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended).
- Keep these in sync after adding pages.

## llms.txt (GEO)
- `app/llms.txt/route.ts` is the machine-readable overview for AI answer engines.
- Add new key pages, blog posts, and docs there so ChatGPT/Claude/Perplexity cite you.

## Blog
- Posts live as data in `lib/content/blog.ts` (markdown body) → `app/blog/[slug]`.
- Each post emits `BlogPosting` JSON-LD (`generateStaticParams` for static render).
- Target long-tail intent: "how to build a SaaS with Next.js", "Next.js SaaS boilerplate with Stripe", "make1day vs <competitor>".

## Structured data
- FAQ → `FAQPage`; blog → `BlogPosting`; home → `Organization` + `WebSite`.
- Inject via `<script type="application/ld+json">` in the page or layout.

## Keyword strategy
- Feature long-tails in headings + FAQ; competitor "alternative" terms in a compare page; tutorials in the blog.
- Prefer 4–6 specific terms over 1 broad term.

## Do / Don't
- DO keep metadata truthful (no keyword stuffing).
- DON'T block indexable pages in robots.
- DON'T forget the `?lang=` sitemap variants — crawlers don't run JS.

After adding a page: update `sitemap.ts`, `llms.txt`, and any FAQ/blog cross-links.
