// Packs the ShipKit source tree into a customized template ZIP.
// The generated project is the same source that builds cleanly, but unselected
// modules are genuinely pruned (see ./prune) and the rest is pre-configured to
// the user's picks, with package.json renamed.

import fs from "fs/promises";
import path from "path";
import JSZip from "jszip";
import type { BuilderConfig } from "./config";
import { slugify } from "./config";
import {
  buildEnvExample,
  buildReadme,
  buildConfigJson,
  buildWranglerToml,
} from "./templates";
import {
  computeSkip,
  buildPaymentNoneStub,
  buildPaymentIndex,
  buildAiProviders,
  buildAiIndex,
  pruneNav,
  pruneDemoRoute,
  prunePostLoginRedirects,
  pruneAgentReadyLink,
  pruneAdminLink,
  pruneWorkspacesLink,
  pruneTicketsNav,
  pruneStylesLink,
  pruneStylesSitemap,
  pruneBuilderNav,
  pruneBuilderCta,
  pruneBuilderSitemap,
  pruneBuilderRobots,
  pruneLicenseGateDefault,
  postLoginTarget,
} from "./prune";
import { buildGlobalsCss, isLight } from "./themes";
import { buildAiDocSpec } from "./spec";
import {
  injectAppCopy,
  buildCustomerHome,
  buildCustomerPricing,
  buildCustomerSitemap,
  buildCustomerRobots,
  buildCustomerLegal,
  neutralizeRootLayout,
  customerNav,
  customerNavBrand,
  customerFooter,
  customerLicenseLinks,
  customerLoginLinks,
  customerSeoLinks,
  neutralizeBrand,
} from "./customer-site";
// Single source of truth for AGENTS.md / design.md / scoped rules. The very
// same renderer ships inside the ZIP and powers `npm run ai:docs`, so a
// customer regenerating docs after a config change gets identical output.
import { buildDocSet } from "../../scripts/lib/ai-docs.mjs";

const ROOT_OK = [
  "app",
  "components",
  "lib",
  "supabase",
  "public",
  "skills",
  "package.json",
  "tsconfig.json",
  "next.config.mjs",
  "tailwind.config.ts",
  "postcss.config.mjs",
  "middleware.ts",
  ".gitignore",
  "LICENSE",
];

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".vercel",
  ".workbuddy",
]);

async function walk(
  absDir: string,
  relBase: string,
  skip: Set<string>,
  visit: (rel: string, abs: string) => Promise<void>,
): Promise<void> {
  const entries = await fs.readdir(absDir, { withFileTypes: true });
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    if (e.name.startsWith(".") && e.name !== ".gitignore") continue;
    const abs = path.join(absDir, e.name);
    // Normalise to POSIX separators so the `skip` set (authored with "/")
    // matches on every platform and the archive extracts cleanly on macOS/Linux.
    const rel = (relBase ? path.join(relBase, e.name) : e.name)
      .split(path.sep)
      .join("/");
    // Module-level pruning: drop files the user didn't select.
    if (skip.has(rel)) continue;
    const stat = await fs.stat(abs);
    if (stat.isDirectory()) {
      await walk(abs, rel, skip, visit);
    } else if (stat.isFile()) {
      await visit(rel, abs);
    }
  }
}

/**
 * Every file the paid build would contain for this configuration.
 *
 * The free preview uses it as its inventory ("here is exactly what a
 * license unlocks") — the list is derived from the very same pruning
 * rules the ZIP uses, so it can never drift from reality.
 */
export async function listProjectFiles(
  config: BuilderConfig,
): Promise<string[]> {
  const root = process.cwd();
  const skip = computeSkip(config);
  const files: string[] = [];

  for (const item of ROOT_OK) {
    const abs = path.join(root, item);
    try {
      const stat = await fs.stat(abs);
      if (stat.isDirectory()) {
        await walk(abs, item, skip, async (rel) => {
          files.push(rel);
        });
      } else if (stat.isFile()) {
        files.push(item);
      }
    } catch {
      // optional top-level entry (e.g. public/) may not exist
    }
  }

  // Selection-driven files that the packer writes itself.
  files.push(
    "package.json",
    ".env.example",
    "README.md",
    "shipkit.config.json",
    "app/globals.css",
    "lib/payments/index.ts",
  );
  if (config.payment === "none") files.push("lib/payments/none.ts");

  // Agent-native delivery: the exact doc set the packer ships.
  const spec = buildAiDocSpec(config);
  files.push("ai/doc-spec.json", ...Object.keys(buildDocSet(spec)));
  files.push(
    "scripts/ai-docs.mjs",
    "scripts/ai-setup.mjs",
    "scripts/lib/ai-docs.mjs",
    "scripts/export-local-profiles.mjs",
    // package.json advertises `npm run rebrand`, so the script has to ship.
    "scripts/rebrand.mjs",
  );
  if (config.deploy === "cloudflare") files.push("wrangler.toml");

  return Array.from(new Set(files)).sort();
}

export async function buildProjectZip(config: BuilderConfig): Promise<Uint8Array> {
  const root = process.cwd();
  const slug = slugify(config.appName);
  const zip = new JSZip();

  const skip = computeSkip(config);

  for (const item of ROOT_OK) {
    const abs = path.join(root, item);
    try {
      const stat = await fs.stat(abs);
      if (stat.isDirectory()) {
        await walk(abs, item, skip, async (rel, fileAbs) => {
          zip.file(rel, await fs.readFile(fileAbs));
        });
      } else if (stat.isFile()) {
        zip.file(item, await fs.readFile(abs));
      }
    } catch {
      // optional top-level entry (e.g. public/) may not exist
    }
  }

  // Override package.json with the chosen app name.
  try {
    const pkgRaw = await fs.readFile(path.join(root, "package.json"), "utf8");
    const pkg = JSON.parse(pkgRaw) as Record<string, unknown>;
    pkg.name = slug;
    pkg.description = `${slug} — an AI SaaS starter generated by ShipKit (by Uncorne).`;
    // scripts/ is site-only (not packed), so its npm aliases must not survive
    // in the customer's package.json. verify-matrix asserts this.
    const scripts = (pkg.scripts as Record<string, string> | undefined) ?? {};
    const next = { ...scripts };
    delete next["waffo:preflight"];
    delete next["verify:matrix"];
    // The downloaded project owns its AI docs: one command rebuilds every
    // contract file, another refreshes Cursor / Claude Code integrations.
    next["ai:docs"] = "node scripts/ai-docs.mjs";
    next["ai:setup"] = "node scripts/ai-setup.mjs";
    pkg.scripts = next;
    zip.file("package.json", JSON.stringify(pkg, null, 2) + "\n");
  } catch {
    /* ignore */
  }

  // ── Payment: wire up ONLY the selected gateway ──
  zip.file("lib/payments/index.ts", buildPaymentIndex(config.payment));
  if (config.payment === "none") {
    zip.file("lib/payments/none.ts", buildPaymentNoneStub());
  }

  // ── Style: inject the chosen palette into globals.css ──
  zip.file("app/globals.css", buildGlobalsCss(config.style));

  // Light themes must drop the `dark` class so Tailwind/color-scheme apply.
  if (isLight(config.style)) {
    try {
      const layoutSrc = await fs.readFile(
        path.join(root, "app/layout.tsx"),
        "utf8",
      );
      zip.file(
        "app/layout.tsx",
        layoutSrc.replace(
          '<html lang="en" className="dark">',
          '<html lang="en">',
        ),
      );
    } catch {
      /* ignore */
    }
  }

  // ── Footer: drop our own product links + wordmark, keep real routes ──
  try {
    const footerSrc = await fs.readFile(
      path.join(root, "components/Footer.tsx"),
      "utf8",
    );
    zip.file(
      "components/Footer.tsx",
      customerFooter(pruneAgentReadyLink(footerSrc), config.appName),
    );
  } catch {
    /* ignore */
  }

  // ── AI: include ONLY the selected providers ──
  zip.file("lib/ai/providers.ts", buildAiProviders(config.ai));
  zip.file("lib/ai/index.ts", buildAiIndex(config.ai));

  // ── Consoles: keep every post-login link pointing at an existing route ──
  // The site source defaults to /account. When the user console is pruned we
  // fall back to /dashboard (demo console) or "/", and rewrite Nav, the demo
  // login, sign-in, OAuth callback and checkout success in one pass.
  const hasDashboard = config.features.includes("dashboard");
  const hasAccount = config.features.includes("account");
  const hasAdmin = config.features.includes("admin");
  const target = postLoginTarget(hasAccount, hasDashboard);

  const rewrite = async (rel: string, fn: (src: string) => string) => {
    try {
      // Only ever rewrite a file that is ALREADY in the archive. Falling back
      // to the disk would silently re-add a pruned file (e.g. the account
      // console in a build that does not ship it).
      const existing = zip.file(rel);
      if (!existing) return;
      const src = await existing.async("string");
      zip.file(rel, fn(src));
    } catch {
      /* optional file */
    }
  };

  // The Style Playground is a ShipKit-site asset; never ship it. Strip its
  // Nav entry from every generated project (pruneNav additionally retargets
  // the account link only when the user console is absent).
  await rewrite("components/Nav.tsx", (s) =>
    customerNavBrand(
      customerNav(pruneNav(pruneStylesLink(pruneBuilderNav(s)), hasAccount, hasDashboard)),
      config.appName,
    ),
  );

  // /admin/tickets is a ShipKit-site-only page. The admin console (when it
  // ships at all) must not link to a route that is absent from the ZIP.
  await rewrite("app/admin/layout.tsx", pruneTicketsNav);

  // The auth-recovery pages are ShipKit-site-only. The login page ships in
  // every build, so its "forgot password" anchor must be removed.
  await rewrite("app/login/page.tsx", customerLoginLinks);

  // The generator itself never ships, so every /builder link has to point
  // at a route that exists in the customer project.
  await rewrite("app/page.tsx", (s) => pruneBuilderCta(s, "/login"));
  await rewrite("components/home/ThemePreviewSection.tsx", (s) =>
    pruneBuilderCta(s, "/login"),
  );
  if (hasAccount) {
    await rewrite("app/account/page.tsx", (s) => pruneBuilderCta(s, "/"));
  }

  // Drop the site-only /styles and /builder entries from the sitemap, and
  // the /builder path from robots.txt.
  await rewrite("app/sitemap.ts", (s) =>
    pruneBuilderSitemap(pruneStylesSitemap(s)),
  );
  await rewrite("app/robots.ts", pruneBuilderRobots);

  // The customer's project ships with the download gate OFF — it must never
  // inherit ShipKit's own paywall (auto = ON in production).
  await rewrite("lib/env.ts", pruneLicenseGateDefault);
  if (target !== "/account") {
    await rewrite("app/auth/demo/route.ts", (s) => pruneDemoRoute(s, target));
    for (const rel of [
      "app/login/page.tsx",
      "app/auth/callback/route.ts",
      "app/api/checkout/route.ts",
    ]) {
      await rewrite(rel, (s) => prunePostLoginRedirects(s, target));
    }
  }
  // The user console offers an "Admin console" shortcut to allowlisted
  // operators. If /admin was pruned, retarget it instead of leaving a 404.
  if (hasAccount && !hasAdmin) {
    await rewrite("app/account/layout.tsx", pruneAdminLink);
  }
  // When multitenancy is OFF, drop the workspaces nav entry (dead route).
  if (hasAccount && !config.features.includes("multitenancy")) {
    await rewrite("app/account/layout.tsx", pruneWorkspacesLink);
  }

  // ── Customer-owned site ────────────────────────────────────────────────
  // ShipKit's own home / pricing / blog / compare / faq / license pages are
  // pruned (SITE_MARKETING_FILES). These are their brand-free replacements,
  // built from the customer's own BuilderConfig. Written AFTER the rewrites
  // above so nothing re-introduces our marketing copy.
  zip.file("app/page.tsx", buildCustomerHome(config));
  zip.file("app/pricing/page.tsx", buildCustomerPricing(config));
  zip.file("app/sitemap.ts", buildCustomerSitemap(config));
  zip.file("app/robots.ts", buildCustomerRobots());
  zip.file("app/privacy/page.tsx", buildCustomerLegal("privacy", config));
  zip.file("app/terms/page.tsx", buildCustomerLegal("terms", config));

  // The generated pages resolve their copy through the shipped dictionary.
  await rewrite("lib/i18n-core.ts", (s) =>
    neutralizeBrand(injectAppCopy(s), config.appName),
  );
  await rewrite("app/layout.tsx", (s) =>
    neutralizeRootLayout(s, config.appName),
  );
  await rewrite("components/SeoLinks.tsx", customerSeoLinks);
  await rewrite("app/account/licenses/page.tsx", customerLicenseLinks);
  // Files that stay but still mention our product in prose / metadata.
  for (const rel of [
    "app/premium/page.tsx",
    "app/rag/page.tsx",
    "app/opengraph-image.tsx",
    "app/api/ai/route.ts",
  ]) {
    await rewrite(rel, (s) => neutralizeBrand(s, config.appName));
  }

  // Generated, selection-driven files.
  zip.file(".env.example", buildEnvExample(config));
  zip.file("README.md", buildReadme(config));
  zip.file("shipkit.config.json", buildConfigJson(config));

  // ── Agent-Native Delivery ──────────────────────────────────────────────
  // Root AGENTS.md (standard name), style-locked design.md, scoped rules with
  // globs, a skills index, Cursor .mdc rules and CLAUDE.md. All from one spec.
  const spec = buildAiDocSpec(config);
  zip.file("ai/doc-spec.json", JSON.stringify(spec, null, 2) + "\n");
  for (const [rel, content] of Object.entries(buildDocSet(spec))) {
    zip.file(rel, content);
  }
  // Ship the renderer + CLIs so `npm run ai:docs` / `ai:setup` work offline
  // inside the extracted project. scripts/ is not part of ROOT_OK.
  for (const rel of [
    "scripts/lib/ai-docs.mjs",
    "scripts/ai-docs.mjs",
    "scripts/ai-setup.mjs",
    // Local → Supabase migration helper for the account / role store. The
    // admin console tells the operator to run `npm run export:profiles`, so
    // the script has to exist in the generated project too.
    "scripts/export-local-profiles.mjs",
    // Referenced by package.json's `npm run rebrand`.
    "scripts/rebrand.mjs",
  ]) {
    zip.file(rel, await fs.readFile(path.join(root, rel), "utf8"));
  }
  if (config.deploy === "cloudflare") {
    zip.file("wrangler.toml", buildWranglerToml(config));
  }

  const buf = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return buf;
}
