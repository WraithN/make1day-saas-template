// Builds the JSON spec consumed by scripts/lib/ai-docs.mjs.
//
// Keeping the data here (TypeScript, with access to PALETTES and option labels)
// and the rendering there (dependency-free ESM) means the site's ZIP packer and
// the downloaded project's `npm run ai:docs` produce byte-identical documents.

import type { BuilderConfig } from "./config";
import {
  STYLE_OPTIONS,
  SKILL_OPTIONS,
  PAYMENT_OPTIONS,
  FEATURE_OPTIONS,
  DEPLOY_OPTIONS,
  AI_OPTIONS,
  AUTH_OPTIONS,
  slugify,
} from "./config";
import { PALETTES } from "./themes";
import { skillFiles, SKILL_GLOBS } from "./prune";

const TOKENS: { key: keyof (typeof PALETTES)["midnight"]; css: string; role: string }[] = [
  { key: "bg", css: "--bg", role: "Page background" },
  { key: "surface", css: "--surface", role: "Cards, inputs, raised panels" },
  { key: "line", css: "--line", role: "1px borders, dividers" },
  { key: "accent", css: "--accent", role: "Primary CTA, focus ring, eyebrow, links" },
  { key: "accent2", css: "--accent2", role: "Gradient partner, secondary highlights" },
  { key: "ink", css: "--ink", role: "Headings and primary text" },
  { key: "inkSoft", css: "--ink-soft", role: "Body copy" },
  { key: "muted", css: "--muted", role: "Captions, metadata, disabled text" },
];

const TEXTURE_RULES: Record<string, string> = {
  grid: "A faint 28px linear-gradient grid at ~10% accent alpha. Apply to hero / empty-state surfaces only, never behind body copy.",
  dots: "A 20px radial-gradient dot field at ~10% accent alpha. Decorative surfaces only; keep text on a solid `surface` card.",
  glow: "Two large soft radial gradients (accent + accent2, 8–10% alpha) anchored to the top and bottom corners. No grain, no blur layers over text.",
  none: "No decorative texture. Use flat solid surfaces and spacing to create hierarchy — this style is intentionally quiet.",
};

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", "Inter", "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
const FONT_MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace';

function hex(rgb: string): string {
  return (
    "#" +
    rgb
      .trim()
      .split(/\s+/)
      .map((n) => Number(n).toString(16).padStart(2, "0"))
      .join("")
  ).toUpperCase();
}

function label<T extends string>(
  options: { id: T; label: string }[],
  id: T,
): string {
  return options.find((o) => o.id === id)?.label ?? id;
}

type StyleInfo = {
  id: string;
  name: string;
  mood: string;
  scheme: string;
  radius: string;
  texture: string;
  textureRule: string;
  accentHex: string;
  accent2Hex: string;
  tokens: { css: string; rgb: string; hex: string; role: string }[];
};

type SkillInfo = {
  id: string;
  label: string;
  note: string;
  file: string;
  globs: string[];
};

export interface AiDocSpec {
  generator: "shipkit-ai-docs";
  version: 1;
  appName: string;
  slug: string;
  config: BuilderConfig;
  style: StyleInfo;
  font: { sans: string; mono: string };
  labels: {
    auth: { id: string; label: string }[];
    payment: { id: string; label: string };
    deploy: { id: string; label: string };
    ai: { id: string; label: string }[];
    features: { id: string; label: string }[];
    skills: SkillInfo[];
  };
  /**
   * FULL catalogue of every option, not just the selected ones. The downloaded
   * project's `npm run ai:docs` uses this to re-derive labels and the style
   * after the user edits shipkit.config.json — no TS/Next runtime needed.
   */
  catalog: {
    auth: { id: string; label: string }[];
    payment: { id: string; label: string }[];
    deploy: { id: string; label: string }[];
    ai: { id: string; label: string }[];
    features: { id: string; label: string }[];
    skills: SkillInfo[];
    styles: Record<string, StyleInfo>;
  };
}

function styleInfo(id: (typeof STYLE_OPTIONS)[number]["id"]): StyleInfo {
  const p = PALETTES[id];
  return {
    id,
    name: label(STYLE_OPTIONS, id),
    mood: STYLE_OPTIONS.find((o) => o.id === id)?.note ?? "",
    scheme: p.scheme,
    radius: p.radius,
    texture: p.texture,
    textureRule: TEXTURE_RULES[p.texture] ?? TEXTURE_RULES.none,
    accentHex: hex(String(p.accent)),
    accent2Hex: hex(String(p.accent2)),
    tokens: TOKENS.map((t) => {
      const rgb = String(p[t.key]);
      return { css: t.css, rgb, hex: hex(rgb), role: t.role };
    }),
  };
}

/** Convert a BuilderConfig into the serialisable input for ai-docs.mjs. */
export function buildAiDocSpec(c: BuilderConfig): AiDocSpec {
  const files = skillFiles();

  const catalog: AiDocSpec["catalog"] = {
    auth: AUTH_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
    payment: PAYMENT_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
    deploy: DEPLOY_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
    ai: AI_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
    features: FEATURE_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
    skills: SKILL_OPTIONS.map((o) => ({
      id: o.id,
      label: o.label,
      note: o.note,
      file: (files[o.id] ?? "").replace(/^skills\//, ""),
      globs: SKILL_GLOBS[o.id] ?? [],
    })),
    styles: Object.fromEntries(
      STYLE_OPTIONS.map((o) => [o.id, styleInfo(o.id)]),
    ),
  };

  const pick = <T extends { id: string }>(arr: T[], id: string): T | undefined =>
    arr.find((x) => x.id === id);
  const pickMany = <T extends { id: string }>(arr: T[], ids: string[]): T[] =>
    ids.map((id) => pick(arr, id)).filter((x): x is T => !!x);

  return {
    generator: "shipkit-ai-docs",
    version: 1,
    appName: c.appName.trim() || "My SaaS",
    slug: slugify(c.appName),
    config: c,
    style: catalog.styles[c.style] ?? styleInfo("midnight"),
    font: { sans: FONT_STACK, mono: FONT_MONO },
    labels: {
      auth: pickMany(catalog.auth, c.auth),
      payment: pick(catalog.payment, c.payment) ?? {
        id: c.payment,
        label: c.payment,
      },
      deploy: pick(catalog.deploy, c.deploy) ?? { id: c.deploy, label: c.deploy },
      ai: pickMany(catalog.ai, c.ai),
      features: pickMany(catalog.features, c.features),
      skills: pickMany(catalog.skills, c.skills),
    },
    catalog,
  };
}
