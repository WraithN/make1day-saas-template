// SaaS visual styles for the generated template.
//
// Each style is just a palette of CSS custom properties. The running ShipKit
// app and the generated scaffold both consume these via Tailwind's
// `rgb(var(--x) / <alpha-value>)` tokens, so switching a style is a single
// `:root` swap — no duplicated component CSS.

import type { StyleId } from "./config";

type Palette = {
  scheme: "dark" | "light";
  /** Space-separated RGB channels, e.g. "10 11 15". */
  bg: string;
  surface: string;
  line: string;
  accent: string;
  accent2: string;
  ink: string;
  inkSoft: string;
  muted: string;
  /** Corner radius used by cards / buttons (CSS length). */
  radius: string;
  /** Decorative surface texture for the live preview. */
  texture: "grid" | "dots" | "glow" | "none";
};

export const PALETTES: Record<StyleId, Palette> = {
  // ── Dark ──────────────────────────────────────────────
  midnight: {
    scheme: "dark",
    bg: "10 11 15",
    surface: "17 19 25",
    line: "35 38 47",
    accent: "94 234 212",
    accent2: "96 165 250",
    ink: "242 244 247",
    inkSoft: "200 207 217",
    muted: "171 179 194",
    radius: "1rem",
    texture: "grid",
  },
  aurora: {
    scheme: "dark",
    bg: "11 10 25",
    surface: "22 19 43",
    line: "49 42 82",
    accent: "167 139 250",
    accent2: "34 211 238",
    ink: "245 243 255",
    inkSoft: "196 189 224",
    muted: "148 140 179",
    radius: "1.5rem",
    texture: "glow",
  },
  emerald: {
    scheme: "dark",
    bg: "7 18 14",
    surface: "13 28 22",
    line: "28 48 39",
    accent: "52 211 153",
    accent2: "251 191 36",
    ink: "236 247 240",
    inkSoft: "187 207 195",
    muted: "132 156 142",
    radius: "0.875rem",
    texture: "dots",
  },
  sunset: {
    scheme: "dark",
    bg: "18 12 20",
    surface: "30 20 30",
    line: "58 40 52",
    accent: "251 146 60",
    accent2: "244 114 182",
    ink: "252 244 246",
    inkSoft: "214 198 208",
    muted: "170 150 162",
    radius: "1.25rem",
    texture: "glow",
  },
  ocean: {
    scheme: "dark",
    bg: "8 15 30",
    surface: "15 26 46",
    line: "30 46 74",
    accent: "56 189 248",
    accent2: "45 212 191",
    ink: "236 245 255",
    inkSoft: "186 204 226",
    muted: "130 152 180",
    radius: "1rem",
    texture: "grid",
  },
  mono: {
    scheme: "dark",
    bg: "9 9 11",
    surface: "17 17 20",
    line: "39 39 44",
    accent: "240 240 245",
    accent2: "130 130 140",
    ink: "240 240 245",
    inkSoft: "180 180 190",
    muted: "130 130 140",
    radius: "0rem",
    texture: "grid",
  },
  // ── Light ─────────────────────────────────────────────
  paper: {
    scheme: "light",
    bg: "247 248 250",
    surface: "255 255 255",
    line: "226 232 240",
    accent: "79 70 229",
    accent2: "236 72 153",
    ink: "15 23 42",
    inkSoft: "71 85 105",
    muted: "148 163 184",
    radius: "0.75rem",
    texture: "none",
  },
  slate: {
    scheme: "light",
    bg: "241 245 249",
    surface: "255 255 255",
    line: "203 213 225",
    accent: "37 99 235",
    accent2: "14 165 233",
    ink: "15 23 42",
    inkSoft: "51 65 85",
    muted: "100 116 139",
    radius: "0.5rem",
    texture: "none",
  },
  candy: {
    scheme: "light",
    bg: "253 244 250",
    surface: "255 255 255",
    line: "244 214 232",
    accent: "236 72 153",
    accent2: "167 139 250",
    ink: "51 24 46",
    inkSoft: "110 70 104",
    muted: "171 139 167",
    radius: "1.75rem",
    texture: "dots",
  },
  sand: {
    scheme: "light",
    bg: "250 245 236",
    surface: "255 252 245",
    line: "231 220 201",
    accent: "194 120 72",
    accent2: "201 138 74",
    ink: "38 28 20",
    inkSoft: "92 76 60",
    muted: "150 132 110",
    radius: "0.75rem",
    texture: "none",
  },
};

export function isLight(style: StyleId): boolean {
  return PALETTES[style].scheme === "light";
}

/** CSS custom properties for a style — handy for a live preview wrapper. */
export function themeVars(style: StyleId): Record<string, string> {
  const p = PALETTES[style];
  return {
    "--bg": p.bg,
    "--surface": p.surface,
    "--line": p.line,
    "--accent": p.accent,
    "--accent2": p.accent2,
    "--ink": p.ink,
    "--ink-soft": p.inkSoft,
    "--muted": p.muted,
    "--radius": p.radius,
  };
}

/**
 * Decorative background for the contained style preview (texture only).
 *
 * Returns the SAME set of longhand properties on every call. Two reasons:
 *  1. React only updates values on rerender instead of adding/removing keys
 *     (e.g. glow has no `backgroundSize`, grid does).
 *  2. These longhands are never mixed with a `background` shorthand on the
 *     same element — mixing them throws a style-conflict warning and can drop
 *     the texture. The preview uses `backgroundColor` for the base color.
 */
export function textureStyle(style: StyleId): Record<string, string> {
  const p = PALETTES[style];
  const a = `rgb(${p.accent} / 0.10)`;
  const a2 = `rgb(${p.accent2} / 0.08)`;
  switch (p.texture) {
    case "grid":
      return {
        backgroundImage: `linear-gradient(to right, ${a} 1px, transparent 1px), linear-gradient(to bottom, ${a} 1px, transparent 1px)`,
        backgroundSize: "28px 28px",
        backgroundRepeat: "repeat",
      };
    case "dots":
      return {
        backgroundImage: `radial-gradient(${a} 1.4px, transparent 1.4px)`,
        backgroundSize: "20px 20px",
        backgroundRepeat: "repeat",
      };
    case "glow":
      return {
        backgroundImage: `radial-gradient(120% 80% at 50% -10%, ${a} 0%, transparent 60%), radial-gradient(80% 60% at 90% 110%, ${a2} 0%, transparent 55%)`,
        backgroundSize: "auto",
        backgroundRepeat: "no-repeat",
      };
    default:
      return {
        backgroundImage: "none",
        backgroundSize: "auto",
        backgroundRepeat: "repeat",
      };
  }
}

const STATIC_CSS = `
@tailwind base;
@tailwind components;
@tailwind utilities;

html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

html,
body {
  font-family: var(--font-sans);
  font-weight: 400;
  /* Crisp text: OS-native antialiasing. Forced grayscale AA,
     optimizeLegibility and font-synthesis:none make glyphs thin/blurry.
     Solid surfaces + no hover transform keep subpixel AA intact. */
  -webkit-font-smoothing: auto;
  -moz-osx-font-smoothing: auto;
  text-rendering: auto;
  font-synthesis: weight style;
  font-kerning: normal;
  font-optical-sizing: auto;
  -webkit-tap-highlight-color: transparent;
}

body {
  line-height: 1.6;
  font-size: 16px;
  /* clip (not hidden) keeps position:sticky working while blocking sideways scroll. */
  overflow-x: clip;
}

img,
video,
table,
pre {
  max-width: 100%;
}

.tech-grid {
  background-image: linear-gradient(
      to right,
      rgb(var(--accent) / 0.04) 1px,
      transparent 1px
    ),
    linear-gradient(to bottom, rgb(var(--accent) / 0.04) 1px, transparent 1px);
  background-size: 44px 44px;
  -webkit-mask-image: radial-gradient(
    ellipse 80% 50% at 50% 0%,
    #000 40%,
    transparent 75%
  );
  mask-image: radial-gradient(
    ellipse 80% 50% at 50% 0%,
    #000 40%,
    transparent 75%
  );
}

@layer components {
  .wrap {
    @apply mx-auto w-full max-w-6xl px-4 sm:px-5;
  }
  .eyebrow {
    @apply font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-accent sm:text-xs sm:tracking-[0.22em];
  }
  .tag {
    @apply inline-block font-mono text-[11px] font-medium uppercase tracking-wider text-muted border border-line rounded px-2 py-1;
  }
  .chip {
    @apply font-mono text-[11px] font-medium text-ink-soft border border-line rounded px-2 py-1;
  }
  /* Solid surface (no backdrop-blur) keeps text crisp. */
  .card {
    @apply border border-line rounded-2xl bg-surface p-4 sm:p-5;
  }
  .btn-solid {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border-radius: 0.5rem;
    background: rgb(var(--accent));
    color: rgb(var(--bg));
    font-weight: 600;
    /* 44px minimum tap target for touch devices. */
    min-height: 44px;
    padding: 0.625rem 1rem;
    font-size: 0.875rem;
    transition: box-shadow 0.15s ease;
  }
  .btn-solid:hover {
    /* No transform: a compositing layer would rasterise the label. */
    box-shadow: 0 8px 26px -8px rgb(var(--accent) / 0.55);
  }
  .btn-ghost {
    @apply inline-flex items-center justify-center gap-2 rounded-lg border border-line text-ink px-4 py-2.5 text-sm transition hover:border-accent hover:text-accent;
    min-height: 44px;
  }
  .input {
    /* 16px on mobile prevents iOS Safari from auto-zooming on focus. */
    @apply w-full rounded-lg bg-bg border border-line px-3 py-2.5 text-base text-ink outline-none focus:border-accent sm:text-sm;
    min-height: 44px;
  }
}

.grad-text {
  background: linear-gradient(90deg, rgb(var(--accent)), rgb(var(--accent2)));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

::selection {
  background: rgb(var(--accent) / 0.3);
  color: rgb(var(--ink));
}

/* Style-level corner radius (overrides the fixed Tailwind radii above so each
   ShipKit style has its own "shape" without duplicated component CSS). */
.card,
.btn-solid,
.btn-ghost,
.input {
  border-radius: var(--radius, 1rem);
}
`;

/** Full globals.css for a chosen style (palette injected into :root). */
export function buildGlobalsCss(style: StyleId): string {
  const p = PALETTES[style];
  // ThemeToggle adds `html.light` — generated builds need a matching light
  // palette or the toggle is a no-op in the downloaded project.
  const light = PALETTES.paper;
  return `:root {
  color-scheme: ${p.scheme};
  --bg: ${p.bg};
  --surface: ${p.surface};
  --line: ${p.line};
  --accent: ${p.accent};
  --accent2: ${p.accent2};
  --ink: ${p.ink};
  --ink-soft: ${p.inkSoft};
  --muted: ${p.muted};
  --radius: ${p.radius};
  /* System stack: native hinting, no web-font request, correct CJK face. */
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text",
    "Segoe UI", "Inter", "Helvetica Neue", Arial, "PingFang SC",
    "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei",
    "Noto Sans CJK SC", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", "JetBrains Mono",
    Menlo, Consolas, "Liberation Mono", monospace;
}

html.light {
  color-scheme: light;
  --bg: ${light.bg};
  --surface: ${light.surface};
  --line: ${light.line};
  --accent: ${light.accent};
  --accent2: ${light.accent2};
  --ink: ${light.ink};
  --ink-soft: ${light.inkSoft};
  --muted: ${light.muted};
}

html,
body {
  background: rgb(var(--bg));
  color: rgb(var(--ink));
}
${STATIC_CSS}`;
}
