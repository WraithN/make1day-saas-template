---
name: frontend-dev
description: Build React 19 / Next.js 15 App Router features in a ShipKit project following its conventions (file layout, server vs client components, data flow, styling with Tailwind tokens).
---

# Skill: Frontend Development (ShipKit)

Use this skill when implementing UI, pages, or client components in a ShipKit
project. Follow these rules so generated code matches the existing source.

## Stack
- Next.js 15 App Router, React 19, TypeScript (strict).
- Tailwind CSS with tokens via `rgb(var(--x) / <alpha-value>)` (never hardcode hex).
- zustand for client state; React Server Components by default.

## File layout
- Pages: `app/<route>/page.tsx`. Keep them server components; pass data down.
- Client islands: `app/<route>/<Feature>.tsx` or `components/<Name>.tsx` with `"use client"` at the top.
- Reusable UI: `components/` (e.g. `Card`, `Button`, `Nav`).
- Lib: `lib/` (pure functions, API clients, i18n).

## Rules
- A component is a **server component** unless it needs `useState`/`useEffect`/browser APIs → then `"use client"`.
- Read request-scoped data (language, auth) on the **server** via `lib/i18n-server` (`getLang`, `tr`).
- For **client** translations, use `useLanguage()` from `@/lib/i18n` and the `<Trans>` component — never call server functions in a client component.
- Pass already-translated strings from server to client as props; do not translate inside client components from scratch.
- Co-locate `"use client"` islands; keep the tree shallow.

## Styling
- Use tokens: `bg-surface`, `text-ink`, `text-ink-soft`, `text-muted`, `border-line`, `text-accent`.
- Utilities: `.card`, `.btn-solid`, `.btn-ghost`, `.input`, `.chip`, `.eyebrow`, `.tag`, `.wrap` (see `app/globals.css`).
- Respect `--radius` (style-dependent); prefer token-based radius over arbitrary values.
- Dark/light: the theme class is toggled on `<html>`; do NOT hardcode colors for a single mode.

## i18n
- Add new strings to `lib/i18n-core.ts` dict under a namespaced key (e.g. `feature.x`).
- Provide **all four** locales (`en`, `zh`, `ja`, `fr`); none of them fall back to English.
- Never concatenate translated fragments; use the `{{g}}…{{/g}}` markup for highlight spans.

## Do / Don't
- DO type props with interfaces; DO early-return on loading/empty.
- DON'T import server-only modules (`next/headers`, `cookies`) into client components.
- DON'T add a new UI library unless the task requires it — prefer tokens + Tailwind.

## Common tasks
- Add a page: create `app/<route>/page.tsx`, export `metadata`, render translated content, add it to `app/sitemap.ts`.
- Add a client widget: `"use client"` + `useLanguage`, keep state local.
- Wire a form: controlled inputs with `.input`, validate with Zod on the server route.

When done, run `npx tsc --noEmit` and `npm run build` before declaring success.
