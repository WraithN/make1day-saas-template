// The FREE PREVIEW package.
//
// The generator IS the product: a download is the product. Anonymous
// visitors therefore never receive application source code — not even a
// "Lite" build, because a Lite build still hands over most of the kit.
//
// What they get instead is a shop window:
//
//   README.md              what this preview is, and how to unlock the build
//   PREVIEW.md             the file inventory of the paid build, module by
//                          module, with a one-line description of every file
//   inventory.json         the same inventory, machine-readable
//   shipkit.config.json    the configuration this preview was built from
//   theme/tokens.css       the selected palette as real CSS variables
//   theme/tokens.json      the same palette, machine-readable
//   LICENSE                the MIT license the full build ships with
//
// Nothing here can be used to rebuild the product: no application source,
// no design.md, no AGENTS.md, no skill playbooks. The inventory is derived
// from the very same pruning rules the paid ZIP uses (listProjectFiles),
// so it always describes the real build.

import JSZip from "jszip";
import type { BuilderConfig } from "./config";
import { slugify } from "./config";
import { PALETTES } from "./themes";
import { buildConfigJson } from "./templates";
import { listProjectFiles } from "./pack";

/** Human-readable label for a path segment. */
function title(segment: string): string {
  return segment
    .replace(/\.[a-z]+$/i, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

const AREA_LABELS: Record<string, string> = {
  app: "Application",
  admin: "Admin console",
  account: "User console",
  auth: "Authentication",
  api: "API routes",
  lib: "Library",
  components: "UI components",
  skills: "Agent skill playbooks",
  ai: "Agent delivery",
  supabase: "Database (migrations + RLS)",
  public: "Static assets",
  scripts: "Tooling",
  cursor: "Cursor rules",
};

/** A one-line description of what a file in the paid build does. */
function describeFile(rel: string): string {
  if (rel.startsWith("app/api/")) {
    const route = rel
      .replace(/^app\/api\//, "")
      .replace(/\/route\.ts$/, "")
      .replace(/\.ts$/, "");
    return `${route === "index" ? "Root" : title(route)} endpoint`;
  }
  if (rel.startsWith("app/admin/")) {
    return `Admin console — ${title(rel.replace(/^app\/admin\//, "").replace(/\/page\.tsx$/, ""))}`;
  }
  if (rel.startsWith("app/account/")) {
    return `User console — ${title(rel.replace(/^app\/account\//, "").replace(/\/page\.tsx$/, ""))}`;
  }
  if (rel.startsWith("app/auth/")) {
    return `Auth — ${title(rel.replace(/^app\/auth\//, "").replace(/\/route\.ts$/, "").replace(/\/page\.tsx$/, ""))}`;
  }
  if (rel.endsWith("/page.tsx")) {
    return `${title(rel.replace(/^app\//, "").replace(/\/page\.tsx$/, ""))} page`;
  }
  if (rel.startsWith("skills/")) {
    return `Skill playbook — ${title(rel.replace(/^skills\//, "").replace(/\.md$/, ""))}`;
  }
  if (rel.startsWith("ai/rules/")) {
    return `Scoped agent rule — ${title(rel.replace(/^ai\/rules\//, "").replace(/\.md$/, ""))}`;
  }
  if (rel.startsWith(".cursor/rules/")) {
    return `Cursor rule — ${title(rel.replace(/^\.cursor\/rules\//, "").replace(/\.mdc$/, ""))}`;
  }
  if (rel.startsWith("lib/payments/")) {
    return `Payment adapter — ${title(rel.replace(/^lib\/payments\//, "").replace(/\.ts$/, ""))}`;
  }
  if (rel.startsWith("lib/rag/")) {
    return `RAG — ${title(rel.replace(/^lib\/rag\//, "").replace(/\.ts$/, ""))}`;
  }
  if (rel.startsWith("lib/supabase/")) {
    return `Supabase client — ${title(rel.replace(/^lib\/supabase\//, "").replace(/\.ts$/, ""))}`;
  }
  if (rel.startsWith("supabase/migrations/")) {
    return "SQL migration (tables, RLS, indexes)";
  }
  if (rel.startsWith("scripts/")) {
    return `Tooling — ${title(rel.replace(/^scripts\//, "").replace(/\.mjs$/, ""))}`;
  }
  if (rel.startsWith("components/console/")) {
    return `Console UI — ${title(rel.replace(/^components\/console\//, "").replace(/\.tsx$/, ""))}`;
  }
  if (rel.startsWith("components/")) {
    return `UI — ${title(rel.replace(/^components\//, "").replace(/\.tsx$/, ""))}`;
  }
  if (rel.startsWith("lib/")) {
    return `Library — ${title(rel.replace(/^lib\//, "").replace(/\.ts$/, "").replace(/\.tsx$/, ""))}`;
  }
  if (rel.startsWith("ai/")) {
    return "Agent delivery spec";
  }
  return "Project file";
}

/** Group the inventory into readable sections. */
function groupFiles(files: string[]): { label: string; files: string[] }[] {
  const groups: { label: string; files: string[] }[] = [];
  const push = (label: string, rel: string) => {
    let g = groups.find((x) => x.label === label);
    if (!g) {
      g = { label, files: [] };
      groups.push(g);
    }
    g.files.push(rel);
  };

  for (const rel of files) {
    if (rel.startsWith("app/api/")) push("API routes", rel);
    else if (rel.startsWith("app/admin/")) push("Admin console", rel);
    else if (rel.startsWith("app/account/")) push("User console", rel);
    else if (rel.startsWith("app/auth/")) push("Authentication", rel);
    else if (rel.startsWith("app/")) push("Application pages", rel);
    else if (rel.startsWith("components/")) push("UI components", rel);
    else if (rel.startsWith("lib/")) push("Library & data layer", rel);
    else if (rel.startsWith("supabase/")) push("Database", rel);
    else if (rel.startsWith("skills/")) push("Agent skill playbooks", rel);
    else if (rel.startsWith("ai/")) push("Agent delivery", rel);
    else if (rel.startsWith(".cursor/")) push("Cursor rules", rel);
    else if (rel.startsWith("scripts/")) push("Tooling", rel);
    else if (rel.startsWith("public/")) push("Static assets", rel);
    else push("Project configuration", rel);
  }
  return groups;
}

function moduleSummary(c: BuilderConfig): string[] {
  const lines: string[] = [];
  lines.push(`- **App name:** ${c.appName}`);
  lines.push(`- **Authentication:** ${c.auth.join(", ") || "none"}`);
  lines.push(
    `- **Payments:** ${
      c.payment.length && !c.payment.includes("none")
        ? c.payment.map((p) => title(p)).join(", ")
        : "none"
    }`,
  );
  lines.push(`- **AI providers:** ${c.ai.map((a) => title(a)).join(", ") || "none"}`);
  lines.push(
    `- **Modules:** ${c.features.length ? c.features.map((f) => title(f)).join(", ") : "none"}`,
  );
  lines.push(`- **Design style:** ${title(c.style)}`);
  lines.push(`- **Deploy target:** ${title(c.deploy)}`);
  lines.push(
    `- **Agent skills:** ${c.skills.length ? c.skills.map((s) => title(s)).join(", ") : "none"}`,
  );
  return lines;
}

/** The palette as CSS custom properties — the same tokens the app uses. */
function tokensCss(style: BuilderConfig["style"]): string {
  const p = PALETTES[style];
  return `/* make1day preview — the design tokens of the "${style}" style.
   These are the exact values the full build ships in app/globals.css. */
:root {
  --bg: ${p.bg};
  --surface: ${p.surface};
  --line: ${p.line};
  --accent: ${p.accent};
  --accent2: ${p.accent2};
  --ink: ${p.ink};
  --ink-soft: ${p.inkSoft};
  --muted: ${p.muted};
  --radius: ${p.radius};
  --scheme: ${p.scheme};
  --texture: ${p.texture};
}
`;
}

function tokensJson(style: BuilderConfig["style"]) {
  const p = PALETTES[style];
  return JSON.stringify(
    {
      style,
      scheme: p.scheme,
      radius: p.radius,
      texture: p.texture,
      tokens: {
        bg: p.bg,
        surface: p.surface,
        line: p.line,
        accent: p.accent,
        accent2: p.accent2,
        ink: p.ink,
        inkSoft: p.inkSoft,
        muted: p.muted,
      },
    },
    null,
    2,
  );
}

/**
 * Build the free preview ZIP. It never contains application source code —
 * only the inventory of the paid build, the chosen theme tokens and the
 * configuration.
 */
export async function buildPreviewZip(
  config: BuilderConfig,
): Promise<Uint8Array> {
  const zip = new JSZip();
  const slug = slugify(config.appName);
  const files = await listProjectFiles(config);
  const groups = groupFiles(files);

  const inventory = {
    generator: "shipkit",
    version: 1,
    preview: true,
    appName: config.appName,
    config,
    fileCount: files.length,
    files: files.map((rel) => ({ path: rel, purpose: describeFile(rel) })),
  };

  // ── PREVIEW.md ───────────────────────────────────────────────────────────
  const md: string[] = [];
  md.push(`# ${config.appName} — make1day preview`);
  md.push("");
  md.push(
    "This is the **preview** of the template you configured in the make1day builder.",
  );
  md.push("");
  md.push(
    "It contains no application source code on purpose: the download *is* the product. " +
      "What you get here is the complete inventory of the build you configured — " +
      "every file, what it does — plus the design tokens of the style you picked.",
  );
  md.push("");
  md.push("## What a license unlocks");
  md.push("");
  md.push(
    "- The full Next.js 15 / React 19 / TypeScript source tree, ready to `npm install && npm run dev`",
  );
  md.push("- Every module above, wired together and type-checked (`tsc --noEmit` clean)");
  md.push("- `AGENTS.md`, `design.md`, scoped rules under `ai/rules/`, Cursor rules and `CLAUDE.md`");
  md.push("- The 12 agent skill playbooks in `skills/`");
  md.push("- Supabase migrations with row-level security, seed SQL and the local SQLite fallback");
  md.push("- `npm run ai:docs` — regenerate every contract file from your config");
  md.push("");
  md.push("## Your configuration");
  md.push("");
  md.push(...moduleSummary(config));
  md.push("");
  md.push("## File inventory");
  md.push("");
  md.push(`${files.length} files in the paid build.`);
  md.push("");
  for (const g of groups) {
    md.push(`### ${g.label} (${g.files.length})`);
    md.push("");
    for (const rel of g.files) {
      md.push(`- \`${rel}\` — ${describeFile(rel)}`);
    }
    md.push("");
  }
  md.push("## How to unlock the full build");
  md.push("");
  md.push(
    "1. Buy the **Buyout** license (one-time) or subscribe to **Care** on the pricing page.",
  );
  md.push(
    "2. Paste the license key you receive into the builder's license panel — it is stored in an httpOnly cookie on your device.",
  );
  md.push(
    "3. Generate again: the same configuration downloads the complete source tree instead of this preview.",
  );
  md.push("");
  zip.file("PREVIEW.md", md.join("\n"));

  // ── README.md ────────────────────────────────────────────────────────────
  const readme: string[] = [];
  readme.push(`# ${config.appName} — make1day preview package`);
  readme.push("");
  readme.push(
    "This is a **preview**, not the template. It deliberately contains no application " +
      "source code: it shows you exactly what the paid build contains and which design " +
      "tokens it uses.",
  );
  readme.push("");
  readme.push("| File | What it is |");
  readme.push("| --- | --- |");
  readme.push("| `PREVIEW.md` | The full file inventory of the build you configured |");
  readme.push("| `inventory.json` | The same inventory, machine-readable |");
  readme.push("| `shipkit.config.json` | The builder configuration this preview was made from |");
  readme.push("| `theme/tokens.css` | The design tokens of your chosen style |");
  readme.push("| `theme/tokens.json` | The same palette, machine-readable |");
  readme.push("");
  readme.push(
    "Buy a license and regenerate to receive the complete source tree — " +
      "auth, payments, the AI module, the consoles, the agent-native delivery and the " +
      "database migrations.",
  );
  zip.file("README.md", readme.join("\n"));

  zip.file("inventory.json", JSON.stringify(inventory, null, 2) + "\n");
  zip.file("shipkit.config.json", buildConfigJson(config));
  zip.file("theme/tokens.css", tokensCss(config.style));
  zip.file("theme/tokens.json", tokensJson(config.style) + "\n");

  // The MIT license the full build ships with.
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    zip.file("LICENSE", await fs.readFile(path.join(process.cwd(), "LICENSE")));
  } catch {
    /* optional */
  }

  return zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}
