---
name: ui-design
description: Apply the project's visual design system - tokens, spacing, components, accessibility - when creating or restyling UI, and run the six-point design review before shipping any screen. TRIGGER ON: "改样式", "美化", "设计一下", "UI 检查", "design review", new components/pages - and always before a UI change is committed.
---

# Skill: UI Design (make1day)

Use this skill when designing or restyling any UI surface in a make1day project.
The goal is a cohesive look that respects the active style palette.

## Design tokens (from `app/globals.css` `:root`)
- Backgrounds: `--bg` (page), `--surface` (cards).
- Text: `--ink` (primary), `--ink-soft` (secondary), `--muted` (tertiary/labels).
- Lines/borders: `--line`.
- Brand: `--accent`, `--accent2`.
- Shape: `--radius` (set per style; do not override with fixed values).
- Always use `rgb(var(--x) / <alpha-value>)` so opacity works.

## Principles
1. **Token-first.** Every color comes from a token. No `#hex` or Tailwind color names like `text-blue-500`.
2. **One accent.** Accent is for actions/links/highlights only — not decoration everywhere.
3. **Calm hierarchy.** `ink` → `ink-soft` → `muted` for the reading order. Muted is for meta, not body text.
4. **Consistent radius.** Use `--radius`; cards, inputs, and buttons share it.
5. **Breathing room.** Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 px. Generous section padding (py-16+).

## Component patterns
- `.card`: the primary container — `border border-line rounded-[var(--radius)] bg-surface p-5`.
- `.btn-solid`: primary action — accent fill, `--bg` text, subtle lift on hover.
- `.btn-ghost`: secondary — border + ink, accent on hover.
- `.input`: full-width, bg `--bg`, focus border accent.
- `.eyebrow`: small uppercase mono label in accent — used above headings.
- `.tag` / `.chip`: mono meta pills.

## Layout
- Center content with `.wrap` (max-w-6xl, px-5).
- Section rhythm: `space-y-8` between cards, `py-16`/`py-24` between sections.
- Responsive: `grid` with `sm:grid-cols-2` / `lg:grid-cols-[1fr_360px]` for two-column builder-style layouts.

## Dark & light
- Support both: the `<html>` theme class is toggled by `ThemeToggle`. Never bake a single mode into components.
- Check contrast in both modes (accent on `--bg` for solid buttons is safe by construction).

## Accessibility
- Labels on all inputs; `aria-label` on icon buttons (e.g. theme/language toggles).
- Focus-visible rings via `accent`/`line`.
- Don't rely on color alone — pair with text or icons.

## Don't
- Don't introduce a second accent hue.
- Don't use emoji as the primary visual language.
- Don't break the radius system with one-off `rounded-3xl`.

Preview a new palette's "feel" using the Builder's contained StylePreview before committing to a look.

## Design review (run before any UI change ships)
Six checks, in order; fix in this order too:
1. **Hierarchy** - one H1 per page; is the primary action the loudest thing
   in its region? Squint test: the page should still show one clear focus.
2. **Contrast** - body text ≥4.5:1 against its background IN BOTH palettes
   (`html.light` flips tokens; muted-on-surface is the usual failure).
   Never ship a token pair you haven't seen in both modes.
3. **States** - hover, focus-visible, disabled, loading, empty, error all
   exist and look intentional; a form with no error state is unfinished.
4. **Touch** - targets ≥44px tall at 390px viewport; no two actions within
   8px of each other; tables get horizontal scroll, not crushed columns.
5. **Consistency** - colors only from tokens, radii only from `--radius`,
   spacing from the 4/8/12/16/24/32/48 scale; grep your diff for stray
   `#[0-9a-f]` or `text-(blue|green|red)-`.
6. **Copy** - labels say what happens ("Download the ZIP", not "Submit");
   errors say what to do next. A screen that needs a tooltip to be
   understood needs a copy fix.
