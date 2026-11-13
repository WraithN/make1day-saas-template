// The FREE PREVIEW package.
//
// The generator IS the product: a download is the product. Anonymous
// visitors therefore never receive application source code — not even a
// "Lite" build, because a Lite build still hands over most of the kit.
//
// What they get instead is a shop window WITH a runnable frame:
//
//   package.json + tsconfig + configs   a real project skeleton (installs)
//   app/                               placeholder layout/page in YOUR style
//   .env.example                       the env contract of YOUR config
//   README.md              what this preview is, and how to unlock the build
//   PREVIEW.md             the file inventory of the paid build, module by
//                          module, with a one-line description of every file
//   inventory.json         the same inventory, machine-readable
//   app-template.config.json  the configuration this preview was built from
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
import { PALETTES, buildGlobalsCss } from "./themes";
import { buildConfigJson, buildEnvExample } from "./templates";
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
 * Build the free preview ZIP. It contains the complete project SKELETON —
 * configs, one real themed page you can run, and your .env.example — but
 * never application source: auth, payments, RAG, consoles and the agent
 * docs live only in the paid build.
 */
export async function buildPreviewZip(
  config: BuilderConfig,
): Promise<Uint8Array> {
  const zip = new JSZip();
  const slug = slugify(config.appName);
  const files = await listProjectFiles(config);
  const groups = groupFiles(files);

  const inventory = {
    generator: "template-generator",
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
    "You hold a runnable project SKELETON: package.json, tsconfig, Tailwind v4 wiring, " +
      "your chosen style as the real app/globals.css, a themed placeholder landing page and " +
      "your .env.example. It boots with `npm install && npm run dev`. What it deliberately " +
      "does NOT contain is the product itself: auth, payments, AI, RAG, consoles, the agent " +
      "docs and every module below are the paid build — the download *is* the product.",
  );
  md.push("");
  md.push("## What a license unlocks");
  md.push("");
  md.push(
    "- The full Next.js 15 / React 19 / TypeScript source tree, ready to `npm install && npm run dev`",
  );
  md.push("- Every module above, wired together and type-checked (`tsc --noEmit` clean)");
  md.push("- `AGENTS.md`, `design.md`, scoped rules under `ai/rules/`, Cursor rules and `CLAUDE.md`");
  md.push(
    "- Every agent skill playbook in `skills/` (the preview ships none of them)",
  );
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
    "This is a **preview**, not the product. It ships a runnable project SKELETON — " +
      "configs, your chosen style as the real `app/globals.css`, a placeholder landing " +
      "page and `.env.example` — plus the full inventory of what the paid build adds. " +
      "No application source: auth, payments, AI, RAG, consoles and the agent docs are " +
      "the license unlock.",
  );
  readme.push("");
  readme.push("```bash");
  readme.push("npm install && npm run dev   # the skeleton boots in your chosen style");
  readme.push("```");
  readme.push("");
  readme.push("| File | What it is |");
  readme.push("| --- | --- |");
  readme.push("| `package.json` + `tsconfig.json` + configs | The real project skeleton — installs and runs |");
  readme.push("| `app/` | Placeholder layout/page + your selected style's globals.css |");
  readme.push("| `.env.example` | The env contract of YOUR configuration |");
  readme.push("| `PREVIEW.md` | The full file inventory of the build you configured |");
  readme.push("| `inventory.json` | The same inventory, machine-readable |");
  readme.push("| `app-template.config.json` | The builder configuration this preview was made from |");
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
  zip.file("app-template.config.json", buildConfigJson(config));
  zip.file("theme/tokens.css", tokensCss(config.style));
  zip.file("theme/tokens.json", tokensJson(config.style) + "\n");

  // ── Runnable project skeleton ────────────────────────────────────────────
  // `npm install && npm run dev` boots a real page in YOUR chosen style.
  // Only the two placeholder files under app/ are ours; every real module
  // (auth, payments, AI, RAG, consoles, agent docs) is the paid unlock.
  const minimalDeps = {
    next: "^15.5.0",
    react: "^19.1.0",
    "react-dom": "^19.1.0",
  };
  zip.file(
    "package.json",
    JSON.stringify(
      {
        name: slug,
        version: "0.1.0",
        private: true,
        description: `${config.appName} - preview skeleton generated by the make1day builder. Unlock the full source with a license key.`,
        scripts: {
          dev: "next dev",
          build: "next build",
          start: "next start",
          typecheck: "tsc --noEmit",
        },
        dependencies: minimalDeps,
        devDependencies: {
          "@tailwindcss/postcss": "^4.1.0",
          "@types/node": "^22.0.0",
          "@types/react": "^19.1.0",
          "@types/react-dom": "^19.1.0",
          tailwindcss: "^4.1.0",
          typescript: "^5.7.0",
        },
      },
      null,
      2,
    ) + "\n",
  );
  zip.file(
    "tsconfig.json",
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2017",
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: "esnext",
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "preserve",
          incremental: true,
          plugins: [{ name: "next" }],
          paths: { "@/*": ["./*"] },
        },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
        exclude: ["node_modules"],
      },
      null,
      2,
    ) + "\n",
  );
  zip.file(
    "next.config.mjs",
    "/** @type {import('next').NextConfig} */\nconst nextConfig = {};\n\nexport default nextConfig;\n",
  );
  zip.file(
    "postcss.config.mjs",
    'export default { plugins: { "@tailwindcss/postcss": {} } };\n',
  );
  zip.file("app/globals.css", buildGlobalsCss(config.style));
  zip.file(
    "app/layout.tsx",
    `// Preview skeleton layout - the full build ships the real layout: Nav,
// footer, language system and theme wiring.
import "./globals.css";

export const metadata = {
  title: ${JSON.stringify(config.appName)},
  description: "Preview skeleton generated by the make1day builder.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
  );
  zip.file(
    "app/page.tsx",
    `// Preview skeleton landing - replace it with the real generated pages:
// hero, pricing, auth, dashboard and consoles arrive with your license.
export default function Home() {
  return (
    <main className="wrap py-24">
      <div className="eyebrow">PREVIEW SKELETON</div>
      <h1 className="text-4xl font-bold mt-4">${config.appName}</h1>
      <p className="mt-4 text-[15px] text-ink-soft" style={{ maxWidth: 560 }}>
        This is the build skeleton in the "${config.style}" style: configs,
        theme tokens and a runnable page. Paste your license key in the
        builder and regenerate to download the complete source - auth,
        payments, AI, RAG, consoles and the agent-native docs.
      </p>
      <pre className="mt-8 rounded-xl border p-4 text-[13px] overflow-auto">npm install && npm run dev</pre>
    </main>
  );
}
`,
  );
  zip.file(".env.example", buildEnvExample(config));
  zip.file(
    ".gitignore",
    "node_modules/\n.next/\n.env*\n*.tsbuildinfo\nnext-env.d.ts\n.DS_Store\n",
  );

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
