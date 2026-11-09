// Packs the make1day source tree into a customized template ZIP.
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
  buildOpenNextConfigExample,
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
  pruneAdminLink,
  pruneWorkspacesLink,
  pruneTicketsNav,
  pruneStylesLink,
  pruneStylesSitemap,
  pruneTemplatesSitemap,
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

/**
 * White-label favicon: the site's doodle badge (paper card + highlighter
 * swipe + brick underline) with the generated app's initial in place of the
 * make1day wordmark, so customer tabs never carry our brand.
 */
export function buildCustomerIcon(appName: string): string {
  const cleaned = appName.replace(/[^\p{L}\p{N}]/gu, "");
  const initial = (cleaned.charAt(0) || "A").toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect x="3" y="3" width="58" height="58" rx="14" fill="#fff8e7" stroke="#111111" stroke-width="5"/>
  <g transform="rotate(-4 32 32)">
    <rect x="14" y="18" width="36" height="28" rx="6" fill="#ffd93d"/>
    <text x="32" y="41" text-anchor="middle"
          font-family="ui-rounded, 'Segoe UI', system-ui, sans-serif"
          font-size="30" font-weight="900" fill="#111111">${initial}</text>
  </g>
  <path d="M15 50 Q 32 56 49 50" fill="none" stroke="#c9503a" stroke-width="4" stroke-linecap="round"/>
</svg>
`;
}

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
  if (config.payment.includes("none") || config.payment.length === 0)
    files.push("lib/payments/none.ts");

  // Agent-native delivery: the exact doc set the packer ships.
  const spec = buildAiDocSpec(config);
  files.push("ai/doc-spec.json", ...Object.keys(buildDocSet(spec)));
  files.push(
    "scripts/ai-docs.mjs",
    "scripts/ai-setup.mjs",
    "scripts/lib/ai-docs.mjs",
    "scripts/export-local-profiles.mjs",
    // package.json advertises `npm run rebrand` and `npm run agents:lint`,
    // so both scripts have to ship with the generated project.
    "scripts/rebrand.mjs",
    "scripts/agents-lint.mjs",
  );
  if (config.deploy === "cloudflare") {
    files.push("wrangler.toml", "open-next.config.ts.example");
  }

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
    // No reference to the builder's own brand: a customer ZIP is white-label.
    // The matrix asserts package.json / README / LICENSE carry no brand leak.
    pkg.description = `${slug} — an AI SaaS starter. Configure your stack and ship.`;
    // scripts/ is site-only (not packed), so its npm aliases must not survive
    // in the customer's package.json — a surviving alias is a dead entry whose
    // target file does not exist in the ZIP. verify-matrix asserts this list.
    const SITE_ONLY_SCRIPTS = [
      "waffo:preflight",
      "verify:matrix",
      "probe:webhook",
      "smoke",
      "smoke:gate",
      "smoke:ai:quota",
      "smoke:ai:quota:supabase",
      "smoke:ai:stream",
      "rag:bench",
    ];
    const scripts = (pkg.scripts as Record<string, string> | undefined) ?? {};
    const next = { ...scripts };
    for (const name of SITE_ONLY_SCRIPTS) delete next[name];
    // The downloaded project owns its AI docs: one command rebuilds every
    // contract file, another refreshes Cursor / Claude Code integrations.
    next["ai:docs"] = "node scripts/ai-docs.mjs";
    next["ai:setup"] = "node scripts/ai-setup.mjs";
    if (config.deploy === "cloudflare") {
      // Official OpenNext Cloudflare adapter scripts. The adapter itself is
      // added to devDependencies below; tsc on the extracted project must
      // not require an uninstalled module (hence the .ts.example config).
      next["preview"] =
        "opennextjs-cloudflare build && opennextjs-cloudflare preview";
      next["deploy"] =
        "opennextjs-cloudflare build && opennextjs-cloudflare deploy";
      next["cf-typegen"] =
        "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts";
      const dev = (pkg.devDependencies as Record<string, string> | undefined) ?? {};
      pkg.devDependencies = {
        ...dev,
        "@opennextjs/cloudflare": "latest",
        wrangler: "latest",
      };
    }
    pkg.scripts = next;
    zip.file("package.json", JSON.stringify(pkg, null, 2) + "\n");
    // White-label favicon: same doodle badge but the app's initial instead of
    // the make1day wordmark — a customer's browser tab must not advertise us.
    zip.file("app/icon.svg", buildCustomerIcon(config.appName));
  } catch {
    /* ignore */
  }

  // ── Payment: wire up ONLY the selected gateway ──
  zip.file("lib/payments/index.ts", buildPaymentIndex(config.payment));
  if (config.payment.includes("none") || config.payment.length === 0) {
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
      customerFooter(footerSrc, config.appName),
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

  // The Style Playground is a make1day-site asset; never ship it. Strip its
  // Nav entry from every generated project (pruneNav additionally retargets
  // the account link only when the user console is absent).
  await rewrite("components/Nav.tsx", (s) =>
    customerNavBrand(
      customerNav(pruneNav(pruneStylesLink(pruneBuilderNav(s)), hasAccount, hasDashboard)),
      config.appName,
    ),
  );

  // /admin/tickets is a make1day-site-only page. The admin console (when it
  // ships at all) must not link to a route that is absent from the ZIP.
  await rewrite("app/admin/layout.tsx", pruneTicketsNav);

  // The customer project keeps its own webhook, but NOT this site's key-email
  // pipeline (lib/license-delivery + lib/mail are operator-only and pruned).
  // Strip the static import and the call so the shipped route still compiles.
  await rewrite("app/api/webhook/route.ts", (s) =>
    s
      .replace(
        /^import \{ deliverLicenseKey \} from "@\/lib\/license-delivery";\n/m,
        "",
      )
      .replace(
        /      \/\/ A paid order must reach the buyer[\s\S]*?\n      \}\n/,
        "      // Issued keys are visible in the operator console.\n" +
          "      await grantLicense(e);\n",
      ),
  );

  // The auth-recovery pages are make1day-site-only. The login page ships in
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
    pruneBuilderSitemap(pruneStylesSitemap(pruneTemplatesSitemap(s))),
  );
  await rewrite("app/robots.ts", pruneBuilderRobots);

  // The customer's project ships with the download gate OFF — it must never
  // inherit make1day's own paywall (auto = ON in production).
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
  // make1day's own home / pricing / blog / compare / faq / license pages are
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
  await rewrite("app/account/licenses/page.tsx", customerLicenseLinks);
  // Files that stay but still mention our product in prose / metadata.
  // lib/env.ts carries the productName() default, so it needs the same wash.
  for (const rel of [
    "app/premium/page.tsx",
    "app/rag/page.tsx",
    "app/opengraph-image.tsx",
    "app/api/ai/route.ts",
    "lib/env.ts",
  ]) {
    await rewrite(rel, (s) => neutralizeBrand(s, config.appName));
  }

  // Generated, selection-driven files.
  zip.file(".env.example", buildEnvExample(config));
  zip.file("README.md", buildReadme(config));
  zip.file("shipkit.config.json", buildConfigJson(config));

  // LICENSE is copied verbatim from ROOT_OK, so it still names OUR company.
  // Re-sign it to the customer: a white-label ZIP must not carry our brand.
  try {
    const licenseSrc = await fs.readFile(path.join(root, "LICENSE"), "utf8");
    zip.file(
      "LICENSE",
      licenseSrc.replace(
        /Copyright \(c\)\s+\d{4}\s+make1day/gi,
        `Copyright (c) ${new Date().getFullYear()} ${config.appName}`,
      ),
    );
  } catch {
    /* LICENSE is optional */
  }

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
    "scripts/agents-lint.mjs",
  ]) {
    zip.file(rel, await fs.readFile(path.join(root, rel), "utf8"));
  }
  if (config.deploy === "cloudflare") {
    zip.file("wrangler.toml", buildWranglerToml(config));
    zip.file("open-next.config.ts.example", buildOpenNextConfigExample());
  }

  // Final white-label pass. Individual rewrites above cover the pages we
  // generate, but the ZIP also carries skills/*.md, agent docs, scripts and
  // copied metadata — any of which can still name OUR product. Sweep every
  // text entry so a customer never goes live advertising the builder.
  const TEXT_FILE =
    /\.(ts|tsx|js|mjs|cjs|json|md|mdx|mdc|txt|css|scss|html|yml|yaml|toml|sql|py|sh)$/i;
  for (const name of Object.keys(zip.files)) {
    const entry = zip.files[name];
    if (entry.dir) continue;
    const isText = TEXT_FILE.test(name) || name === "LICENSE" || name.startsWith(".env");
    if (!isText) continue;
    try {
      const src = await entry.async("string");
      let cleaned = neutralizeBrand(src, config.appName);
      // scripts/agents-lint.mjs ships to the customer project as a generic
      // AI-coding-contract linter. Its BRANDS blacklist names OUR product, so
      // strip it for the customer build — otherwise the brand sweep trips on
      // the linter's own source, and the customer's own run would flag their
      // own app name as an "operator brand" leak. The KEEP_WIRE regex stays
      // (it only names wire identifiers, which the matrix allowlists).
      if (name === "scripts/agents-lint.mjs") {
        cleaned = cleaned.replace(
          /const BRANDS = \[[^\]]*\]/,
          "const BRANDS = []",
        );
      }
      if (cleaned !== src) zip.file(name, cleaned);
    } catch {
      /* binary or already-consumed entry — leave it alone */
    }
  }

  const buf = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return buf;
}
