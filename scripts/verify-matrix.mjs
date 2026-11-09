#!/usr/bin/env node
/**
 * Generated-template build matrix verifier.
 *
 * For each representative Builder configuration:
 *   1. POST /api/generate and download the real ZIP,
 *   2. extract it,
 *   3. assert the generated files / pruning decisions,
 *   4. run `tsc --noEmit` INSIDE the generated project.
 *
 * Requires a running make1day server with the license gate OFF — the matrix
 * downloads the FULL paid ZIP without a license, which a gated deployment
 * correctly refuses:
 *   LICENSE_GATE=off npx next dev -p 3000
 *   node scripts/verify-matrix.mjs --all
 *   node scripts/verify-matrix.mjs --case stripe-candy
 *   node scripts/verify-matrix.mjs --list
 *
 * See docs/build-matrix.md and .github/workflows/generated-matrix.yml.
 */
import { existsSync } from "node:fs";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const BASE_URL = (arg("--base", process.env.BASE_URL ?? "http://127.0.0.1:3000")).replace(/\/+$/, "");
const OUT_ROOT = path.join(ROOT, ".matrix-out");

const BASE = {
  appName: "matrix-app",
  auth: ["email"],
  payment: ["waffo"],
  ai: ["openai"],
  features: ["landing", "dashboard", "account", "admin"],
  deploy: "vercel",
  style: "midnight",
  skills: ["frontend"],
};
const c = (overrides) => ({ ...BASE, ...overrides });
const ALL_SKILLS = [
  "frontend", "ui", "backend", "testing", "seo", "auth",
  "payments", "database", "rag", "i18n", "deploy", "agents",
];

// 18 representative combinations: all 6 payment choices, all 16 styles,
// all 3 deploy targets, RAG on/off, dashboard on/off, both consoles on/off
// and each console alone, multitenancy on/off, skills empty/full,
// auth/AI provider variations.
const CASES = [
  { id: "default-waffo-midnight", config: c({}) },
  { id: "stripe-candy", config: c({ payment: ["stripe"], style: "candy" }) },
  { id: "creem-aurora", config: c({ payment: ["creem"], style: "aurora" }) },
  { id: "paypal-paper", config: c({ payment: ["paypal"], style: "paper" }) },
  { id: "none-mono", config: c({ payment: ["none"], style: "mono" }) },
  {
    id: "waffo-sunset-full",
    config: c({
      style: "sunset",
      auth: ["email", "google", "github", "apple", "microsoft"],
      ai: ["openai", "anthropic", "gemini"],
      features: ["landing", "dashboard", "rag", "multitenancy", "account", "admin", "premium"],
      skills: ALL_SKILLS,
    }),
  },
  {
    id: "waffo-ocean-no-dashboard",
    config: c({ style: "ocean", features: ["landing"] }),
  },
  {
    id: "waffo-slate-email-only",
    config: c({ style: "slate", auth: ["email"], ai: ["anthropic"], skills: [] }),
  },
  { id: "waffo-emerald-gemini", config: c({ style: "emerald", ai: ["gemini"] }) },
  { id: "waffo-sand-cloudflare", config: c({ style: "sand", deploy: "cloudflare" }) },
  { id: "waffo-midnight-selfhost", config: c({ deploy: "selfhost" }) },
  {
    id: "stripe-candy-rag",
    config: c({
      payment: ["stripe"],
      style: "candy",
      features: ["landing", "dashboard", "rag"],
      skills: ["seo"],
    }),
  },
  {
    id: "none-slate-multitenancy",
    config: c({
      payment: ["none"],
      style: "slate",
      features: ["landing", "dashboard", "multitenancy"],
    }),
  },
  {
    id: "creem-mono-all-skills",
    config: c({ payment: ["creem"], style: "mono", skills: ALL_SKILLS }),
  },
  {
    // Only the user console: /admin must be pruned AND its shortcut in the
    // account layout must be rewritten so no dead link survives.
    id: "account-only",
    config: c({ style: "paper", features: ["landing", "account"] }),
  },
  {
    // Only the admin console: the shared console layer must survive even
    // though /account is gone, and Nav must not point at /account.
    id: "admin-only",
    config: c({ style: "slate", features: ["landing", "admin"] }),
  },
  {
    // Lemon Squeezy gateway: the selected adapter must ship and every other
    // case must assert lemonsqueezy.ts is pruned.
    id: "lemonsqueezy-slate",
    config: c({ payment: ["lemonsqueezy"], style: "slate" }),
  },
  {
    // Hand-drawn style: the ZIP must carry the extra ink-outline CSS and the
    // doodle palette, while the other 10 palettes stay untouched.
    id: "waffo-doodle",
    config: c({ style: "doodle" }),
  },
];

if (argv.includes("--list")) {
  for (const x of CASES) console.log(x.id);
  process.exit(0);
}

const only = arg("--case", null);
const selected = only ? CASES.filter((x) => x.id === only) : CASES;
if (selected.length === 0) {
  console.error(`Unknown case: ${only}. Run with --list to see all case ids.`);
  process.exit(1);
}

const DO_BUILD = argv.includes("--build");
const BUILD_ALL = argv.includes("--build-all");
const PUBLISH = argv.includes("--publish");
// Representative subset that gets the deeper `next build` check by default.
const BUILD_SUBSET = ["default-waffo-midnight", "account-only", "admin-only"];
const buildIds = new Set(
  BUILD_ALL
    ? CASES.map((c) => c.id)
    : DO_BUILD
      ? selected.length === 1
        ? selected.map((c) => c.id)
        : BUILD_SUBSET
      : [],
);

const PAYMENT_FILES = {
  stripe: "lib/payments/stripe.ts",
  creem: "lib/payments/creem.ts",
  paypal: "lib/payments/paypal.ts",
  waffo: "lib/payments/waffo.ts",
  lemonsqueezy: "lib/payments/lemonsqueezy.ts",
};
const SKILL_FILES = {
  frontend: "skills/frontend-dev.md",
  ui: "skills/ui-design.md",
  backend: "skills/backend-api.md",
  testing: "skills/testing-qa.md",
  seo: "skills/seo-content.md",
  auth: "skills/auth-security.md",
  payments: "skills/payments.md",
  database: "skills/database.md",
  rag: "skills/rag.md",
  i18n: "skills/i18n.md",
  deploy: "skills/deploy.md",
  agents: "skills/agent-workflow.md",
};
const SITE_ONLY_FILES = [
  "app/api/payments/self-check/route.ts",
  "app/llms.txt/route.ts",
  "app/llms-full.txt/route.ts",
  "app/openapi.json/route.ts",
  "app/api/mcp/route.ts",
  "app/api/markdown/route.ts",
  "app/.well-known/agent-card.json/route.ts",
  // make1day-site operational features (mail / support / auth recovery).
  // Pruned by lib/generator/prune.ts SITE_ONLY_FILES; the absence assertions
  // below keep them out of every generated ZIP without adding matrix cases.
  "lib/content/messaging.ts",
  "lib/mail/types.ts",
  "lib/mail/config.ts",
  "lib/mail/index.ts",
  "lib/mail/templates.ts",
  "app/api/mail/self-check/route.ts",
  "lib/tickets.ts",
  "app/api/support/tickets/route.ts",
  "app/api/support/tickets/[id]/route.ts",
  "app/support/page.tsx",
  "components/SupportForm.tsx",
  "app/admin/tickets/page.tsx",
  "components/TicketStatusSelect.tsx",
  "lib/local-auth-tokens.ts",
  "app/api/auth/password-reset/route.ts",
  "app/api/auth/verify-email/route.ts",
  "app/forgot-password/page.tsx",
  "app/reset-password/page.tsx",
  "app/verify-email/page.tsx",
  "components/AuthFlow.tsx",
  "supabase/migrations/0010_support_tickets.sql",
  // make1day-site delivery + governance (added 2026-11-08).
  // lib/csrf.ts / lib/http-guard.ts / lib/rate-limit.ts and migration 0011
  // ship in every build: customer API routes import them.
  "lib/mail/outbox.ts",
  "lib/license-delivery.ts",
  "lib/legal-lifecycle.ts",
  "app/api/license/claim/route.ts",
  "app/api/cron/mail-outbox/route.ts",
  "app/api/cron/retention/route.ts",
  "app/api/privacy/export/route.ts",
  "app/api/privacy/erase/route.ts",
  "app/api/privacy/consent/route.ts",
  "components/LicenseClaimForm.tsx",
];
// make1day's OWN marketing site. A customer going live must not be advertsing
// our $99 license, our competitors or our SEO posts. These are replaced by
// brand-free customer pages built from their BuilderConfig.
const SITE_MARKETING_FILES = [
  "app/blog/page.tsx",
  "app/blog/[slug]/page.tsx",
  "app/blog/[slug]/md/route.ts",
  "app/compare/page.tsx",
  "app/faq/page.tsx",
  "app/license/page.tsx",
  "lib/content/blog.ts",
  "lib/content/compare.ts",
  "lib/content/faq.ts",
  "components/CompareContent.tsx",
  "components/FaqContent.tsx",
  "components/CustomService.tsx",
  "components/LicensePanel.tsx",
  "components/home/BoundarySection.tsx",
  "components/home/PitfallSection.tsx",
  "components/home/ThemePreviewSection.tsx",
  "components/home/FeatureMatrix.tsx",
  "components/home/BlogTeaser.tsx",
  "components/home/HandDrawnDeco.tsx",
  "app/templates/page.tsx",
  "app/templates/[slug]/preview/page.tsx",
  "components/home/TemplateGallerySection.tsx",
  "components/TemplateSite.tsx",
  "components/TemplateCard.tsx",
  "lib/content/templates.ts",
  "components/home/FaqSection.tsx",
];
// The generator itself must never ship: one purchase would otherwise mean
// unlimited generations (and resales) of the product that was just paid for.
const GENERATOR_FILES = [
  "lib/generator/config.ts",
  "lib/generator/customer-site.ts",
  "lib/generator/pack.ts",
  "lib/generator/prune.ts",
  "lib/generator/preview.ts",
  "lib/generator/schema.ts",
  "lib/generator/spec.ts",
  "lib/generator/templates.ts",
  "lib/generator/themes.ts",
  "app/builder/page.tsx",
  "components/Builder.tsx",
  "app/api/generate/route.ts",
  "app/api/generate/preview/route.ts",
  "app/build-matrix/page.tsx",
  "public/build-matrix.json",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Guard the documented case count: adding/removing a case means the README,
// CI workflow and machine-readable docs numbers must be updated too.
assert(CASES.length === 18, `expected 18 matrix cases, got ${CASES.length}`);

function dirSizeKb(dir) {
  let total = 0;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let entries;
    try {
      entries = fsSync.readdirSync(d, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile()) {
        try {
          total += fsSync.statSync(p).size;
        } catch {
          /* ignore */
        }
      }
    }
  }
  return Math.round(total / 1024);
}

/**
 * Deeper check: run a real `next build` inside the extracted project (it
 * borrows the host's node_modules via directory traversal) and capture the
 * shared First Load JS plus the .next artifact size. Returns null when skipped.
 */
function runBuild(outDir) {
  const nextBin = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
  const started = Date.now();
  let res;
  let log = "";
  // On Windows Next's cleanDistDir races on .next/trace and throws EPERM on a
  // fresh build; a second attempt in the same dir reliably succeeds (project
  // MEMORY §3). Retry once before giving up.
  for (let attempt = 1; attempt <= 2; attempt++) {
    res = spawnSync(
      process.execPath,
      [nextBin, "build"],
      {
        cwd: outDir,
        stdio: ["ignore", "pipe", "pipe"],
        // Suppress the .next/trace file: on Windows Next's cleanDistDir races
        // when deleting/recreating it and throws EPERM (see project MEMORY §3).
        // The trace is a debug-only artifact, so this does not weaken the check.
        env: {
          ...process.env,
          NEXT_TELEMETRY_DISABLED: "1",
          NODE_ENV: "production",
          NEXT_PRIVATE_SUPPRESS_TRACE: "1",
        },
        maxBuffer: 32 * 1024 * 1024,
      },
    );
    log = `${res.stdout ?? ""}${res.stderr ?? ""}`.toString();
    if (res.status === 0) break;
    if (attempt < 2) {
      console.log(`      build attempt ${attempt} failed (exit ${res.status}), retrying`);
    }
  }
  const ok = res.status === 0;
  const m = log.match(/First Load JS shared by all\s+([\d.]+)\s*kB/);
  const sharedKb = m ? parseFloat(m[1]) : null;
  const nextDir = path.join(outDir, ".next");
  const nextKb = existsSync(nextDir) ? dirSizeKb(nextDir) : 0;
  if (!ok) {
    throw new Error(
      `next build failed (exit ${res.status})\n${log.slice(-1200)}`,
    );
  }
  return {
    ok,
    sec: Math.round(((Date.now() - started) / 1000) * 10) / 10,
    sharedKb,
    nextKb,
  };
}

async function download(config) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.status === 402) {
        throw new Error(
          "POST /api/generate returned 402 — start the dev server with LICENSE_GATE=off",
        );
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`POST /api/generate → ${res.status} ${text.slice(0, 300)}`);
      }
      const ct = res.headers.get("content-type") ?? "";
      assert(ct.includes("application/zip"), `expected a ZIP, got content-type: ${ct}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      lastErr = err;
      // Transient connection resets can happen when a sibling `next build`
      // contends with the generator server — back off and retry.
      if (attempt < 3) {
        console.log(`      retry ${attempt} after fetch error: ${err.message}`);
        await new Promise((r) => setTimeout(r, 1500 * attempt));
        continue;
      }
    }
  }
  throw lastErr;
}

async function extract(buf, outDir) {
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });
  const zip = await JSZip.loadAsync(buf);
  let count = 0;
  for (const [rel, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const parts = rel.split("/").filter(Boolean);
    if (parts.some((p) => p === "." || p === "..")) {
      throw new Error(`unsafe zip entry: ${rel}`);
    }
    const dest = path.join(outDir, ...parts);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, await entry.async("nodebuffer"));
    count++;
  }
  return { count, files: new Set(Object.keys(zip.files)) };
}

async function verifyCase(entry, doBuild) {
  const { id, config } = entry;
  const outDir = path.join(OUT_ROOT, id);
  const buf = await download(config);
  const { count, files } = await extract(buf, outDir);
  const read = (rel) => fs.readFile(path.join(outDir, rel), "utf8");
  const exists = (rel) => files.has(rel);

  for (const rel of [
    "package.json",
    "tsconfig.json",
    ".env.example",
    "README.md",
    "shipkit.config.json",
    "design.md",
    "AGENTS.md",
    "CLAUDE.md",
    "ai/doc-spec.json",
    "ai/README.md",
    "ai/rules/README.md",
    "ai/rules/core.md",
    ".cursor/rules/core.mdc",
    "scripts/lib/ai-docs.mjs",
    "scripts/ai-docs.mjs",
    "scripts/ai-setup.mjs",
    "scripts/export-local-profiles.mjs",
    "scripts/rebrand.mjs",
    "scripts/agents-lint.mjs",
  ]) {
    assert(exists(rel), `missing ${rel}`);
  }
  const shippedPkg = JSON.parse(await read("package.json"));
  assert(
    shippedPkg.scripts?.["agents:lint"] === "node scripts/agents-lint.mjs",
    "generated package.json must expose npm run agents:lint",
  );
  // The legacy lowercase name must be gone: on case-insensitive filesystems
  // (Windows) it would collide with the standard root AGENTS.md.
  assert(!exists("agents.md"), "legacy agents.md leaked into ZIP");

  // White-label: every generated project must ship an MIT LICENSE file.
  assert(exists("LICENSE"), "LICENSE missing from ZIP");

  // The hand-drawn ink-outline CSS is style-specific: it must ship for the
  // doodle palette and must NOT leak into any of the other 10 palettes.
  const shippedCss = await read("app/globals.css");
  assert(
    (config.style === "doodle") === shippedCss.includes("--doodle-ink"),
    "doodle CSS leaked into (or is missing from) the generated stylesheet",
  );

  // Site-only endpoints must never leak into a customer project.
  for (const rel of SITE_ONLY_FILES) {
    assert(!exists(rel), `site-only endpoint leaked into ZIP: ${rel}`);
  }

  // make1day's own marketing pages/content must never reach a customer.
  for (const rel of SITE_MARKETING_FILES) {
    assert(!exists(rel), `make1day marketing page leaked into ZIP: ${rel}`);
  }
  // The generator must never leak into a customer project.
  for (const rel of GENERATOR_FILES) {
    assert(!exists(rel), `generator leaked into ZIP: ${rel}`);
  }
  // …and no dead link to a pruned route may survive in the shipped project.
  for (const rel of [
    "components/Nav.tsx",
    "components/Footer.tsx",
    "app/page.tsx",
    "app/pricing/page.tsx",
    "app/sitemap.ts",
    "app/robots.ts",
    "app/account/licenses/page.tsx",
  ]) {
    if (!exists(rel)) continue;
    const src = await read(rel);
    for (const dead of [
      "/builder",
      "/styles",
      '"/blog"',
      '"/compare"',
      '"/faq"',
      '"/license"',
    ]) {
      assert(
        !src.includes(dead),
        `dead link ${dead} survived in ${rel}`,
      );
    }
  }
  // The customer's home + pricing pages must be THEIRS, not ours.
  const customerHome = await read("app/page.tsx");
  assert(
    customerHome.includes("APP_NAME") && customerHome.includes("app.stack.title"),
    "app/page.tsx is not the generated customer landing page",
  );
  const customerPricing = await read("app/pricing/page.tsx");
  assert(
    customerPricing.includes("app.pricing.title") &&
      customerPricing.includes("app.plan.cta"),
    "app/pricing/page.tsx is not the generated customer pricing page",
  );
  // White-label: sweep EVERY text entry in the ZIP. The old three-page check
  // missed skills/*.md, scripts/, generated AI docs, LICENSE and metadata.
  const BRAND_LEAK = [
    "ShipYourProduct", "Uncorne", "make1day",
    "Makerkit", "Supastarter", "ShipFast",
  ];
  // These are wire-level identifiers, not branding — renaming them would
  // break already-issued license keys and MCP client configs.
  const KEEP_WIRE =
    /X-ShipKit-Entitlement|shipkit\.config\.json|x-shipkit-license|shipkit\.db|SK1\./;
  const TEXT_FILE =
    /\.(ts|tsx|js|mjs|cjs|json|md|mdx|mdc|txt|css|scss|html|yml|yaml|toml|sql|py|sh)$/i;
  for (const rel of files) {
    if (rel.endsWith("/")) continue;
    if (!TEXT_FILE.test(rel) && rel !== "LICENSE" && !rel.startsWith(".env")) continue;
    let src;
    try {
      src = await read(rel);
    } catch {
      continue;
    }
    for (const brand of BRAND_LEAK) {
      assert(
        !src.includes(brand),
        `our branding leaked into customer ${rel}: ${brand}`,
      );
    }
    const stray = src
      .split("\n")
      .filter((line) => line.includes("ShipKit") && !KEEP_WIRE.test(line));
    assert(
      stray.length === 0,
      `legacy ShipKit string leaked into customer ${rel}`,
    );
  }
  // The favicon is regenerated per app (buildCustomerIcon in pack.ts); the
  // make1day wordmark must never ship in a customer tab icon.
  const shippedIcon = await read("app/icon.svg");
  assert(
    !/1day/i.test(shippedIcon),
    "customer favicon carries the make1day wordmark",
  );
  // The sitemap must only reference routes that exist in this build.
  const shippedSitemap = await read("app/sitemap.ts");
  assert(
    !shippedSitemap.includes("@/lib/content/blog") &&
      !shippedSitemap.includes("POSTS"),
    "customer sitemap still imports our SEO blog posts",
  );
  // Root metadata must describe the customer's app, not ours.
  const shippedLayout = await read("app/layout.tsx");
  assert(
    shippedLayout.includes("APP_NAME") &&
      !shippedLayout.includes("by make1day") &&
      !shippedLayout.includes("by make1day"),
    "root layout metadata still describes our brand",
  );
  // The customer project must ship with the download gate OFF by default —
  // it must never inherit make1day's own (production = ON) paywall.
  const shippedEnv = await read("lib/env.ts");
  assert(
    /licenseGateMode: \(\) => opt\("LICENSE_GATE", "off"\)/.test(shippedEnv),
    "generated project must default LICENSE_GATE to off",
  );

  // Payment pruning: only the selected adapters survive.
  const enabledPayments = config.payment.filter((p) => p !== "none");
  for (const [name, rel] of Object.entries(PAYMENT_FILES)) {
    if (!enabledPayments.includes(name)) {
      assert(!exists(rel), `unselected adapter shipped: ${rel}`);
    } else {
      assert(exists(rel), `selected adapter missing: ${rel}`);
    }
  }
  assert(
    exists("lib/payments/none.ts") === (config.payment.includes("none") || config.payment.length === 0),
    "none.ts stub must exist only when payments are disabled",
  );

  // Feature / skill pruning.
  assert(
    exists("lib/rag/hybrid.ts") === config.features.includes("rag"),
    "RAG files must be pruned exactly when rag is unchecked",
  );
  assert(
    exists("app/dashboard/page.tsx") === config.features.includes("dashboard"),
    "dashboard route must be pruned exactly when dashboard is unchecked",
  );
  const hasAccount = config.features.includes("account");
  const hasAdmin = config.features.includes("admin");
  assert(
    exists("app/account/page.tsx") === hasAccount,
    "user console must be pruned exactly when account is unchecked",
  );
  assert(
    exists("app/admin/users/page.tsx") === hasAdmin,
    "admin console must be pruned exactly when admin is unchecked",
  );
  assert(
    exists("lib/console.ts") === (hasAccount || hasAdmin),
    "shared console data layer must survive iff at least one console is selected",
  );
  assert(
    exists("lib/content/console.ts") === (hasAccount || hasAdmin),
    "shared console copy must survive iff at least one console is selected",
  );

  // Paid-content (paywall) feature: sample page + reusable component must be
  // pruned exactly when the feature is unchecked. The interception engine
  // (lib/paywall.ts) is core and always ships.
  const hasPremium = config.features.includes("premium");
  assert(
    exists("app/premium/page.tsx") === hasPremium,
    "premium sample page must be pruned exactly when premium is unchecked",
  );
  assert(
    exists("components/Paywall.tsx") === hasPremium,
    "Paywall component must be pruned exactly when premium is unchecked",
  );
  assert(
    exists("lib/paywall.ts"),
    "paywall interception engine must always ship (core, never pruned)",
  );
  const hasMulti = config.features.includes("multitenancy");
  const shipsMulti = hasMulti && hasAccount;
  for (const rel of [
    "app/account/workspaces/page.tsx",
    "components/console/WorkspaceSwitcher.tsx",
    "components/console/WorkspaceManager.tsx",
    "app/api/org/route.ts",
    "app/api/org/active/route.ts",
    "lib/org.ts",
  ]) {
    assert(
      exists(rel) === shipsMulti,
      `multitenancy file ${rel} must ship iff multitenancy AND account are selected`,
    );
  }
  if (hasAccount && !hasMulti) {
    const accountLayout = await read("app/account/layout.tsx");
    assert(
      !accountLayout.includes('const WORKSPACES_HREF = "/account/workspaces"'),
      "user console still links to a pruned /account/workspaces",
    );
  }
  if (hasAccount && !hasAdmin) {
    const accountLayout = await read("app/account/layout.tsx");
    assert(
      !accountLayout.includes('const ADMIN_HREF = "/admin"'),
      "user console still links to a pruned /admin",
    );
  }
  if (!hasAccount) {
    const nav = await read("components/Nav.tsx");
    assert(
      !nav.includes('const ACCOUNT_HREF = "/account"'),
      "Nav still links to a pruned /account",
    );
    const login = await read("app/login/page.tsx");
    assert(
      !login.includes("redirect=/account"),
      "post-login redirect still targets a pruned /account",
    );
    const callback = await read("app/auth/callback/route.ts");
    assert(
      !callback.includes('"/account"'),
      "OAuth callback still targets a pruned /account",
    );
  }
  for (const [name, rel] of Object.entries(SKILL_FILES)) {
    assert(
      exists(rel) === config.skills.includes(name),
      `skill file mismatch: ${rel}`,
    );
  }

  // Generated docs must be real, and the manifest must reflect the picks.
  const design = await read("design.md");
  const agents = await read("AGENTS.md");
  assert(design.length > 200, "design.md is too short to be a real spec");
  assert(agents.length > 2000, "AGENTS.md is too short to be a real contract");
  assert(
    design.includes(config.style) && agents.includes(config.style),
    "generated docs must be style-specific, not a generic copy",
  );
  assert(
    agents.includes("npm run ai:docs") && agents.includes("Scoped rules"),
    "AGENTS.md must document the regeneration command and scoped rules",
  );

  // Agent-native delivery: scoped rules, tool integrations, one shared spec.
  const ruleFiles = [...files].filter(
    (f) => /^ai\/rules\/[^/]+\.md$/.test(f) && f !== "ai/rules/README.md",
  );
  const cursorFiles = [...files].filter((f) => /^\.cursor\/rules\/[^/]+\.mdc$/.test(f));
  // 7 always-on module rules + payments (when enabled) + rag / account / admin
  // (when selected) + exactly one rule per selected skill.
  const hasPayments = config.payment.length > 0 && !config.payment.includes("none");
  const expectedRules =
    7 + (hasPayments ? 1 : 0) +
    (config.features.includes("rag") ? 1 : 0) +
    (hasAccount ? 1 : 0) + (hasAdmin ? 1 : 0) + config.skills.length;
  assert(
    ruleFiles.length === expectedRules,
    `scoped rule count: got ${ruleFiles.length}, expected ${expectedRules}`,
  );
  assert(
    cursorFiles.length === ruleFiles.length,
    `Cursor rules (${cursorFiles.length}) must mirror scoped rules (${ruleFiles.length})`,
  );
  const claude = await read("CLAUDE.md");
  assert(claude.includes("@AGENTS.md") && claude.includes("@design.md"), "CLAUDE.md imports missing");
  const docSpec = JSON.parse(await read("ai/doc-spec.json"));
  assert(docSpec.config?.style === config.style, "ai/doc-spec.json style mismatch");
  assert(docSpec.labels?.skills?.length === config.skills.length, "doc-spec skill count mismatch");
  assert(docSpec.catalog?.skills?.length === 12, "doc-spec catalogue must contain all 12 skills");
  assert(
    Object.keys(docSpec.catalog?.styles ?? {}).length === 16,
    "doc-spec catalogue must contain all 16 palettes",
  );
  const skillsIndex = await read("skills/README.md");
  assert(
    skillsIndex.includes(`${config.skills.length} of 12`),
    "skills/README.md was not regenerated for this build",
  );

  const manifest = JSON.parse(await read("shipkit.config.json"));
  // buildConfigJson wraps the selections under `config`.
  const picks = manifest.config ?? manifest;
  assert(picks.style === config.style, "manifest.config.style mismatch");
  assert(
    JSON.stringify(picks.payment) === JSON.stringify(config.payment),
    "manifest.config.payment mismatch",
  );
  assert(picks.deploy === config.deploy, "manifest.config.deploy mismatch");

  const pkg = JSON.parse(await read("package.json"));
  assert(pkg.name === "matrix-app", `package name mismatch: ${pkg.name}`);
  // Every alias whose target file lives in the site-only scripts/ tree must be
  // stripped by pack.ts — keep in sync with SITE_ONLY_SCRIPTS there.
  for (const dead of [
    "waffo:preflight",
    "verify:matrix",
    "probe:webhook",
    "smoke",
    "smoke:gate",
    "smoke:ai:quota",
    "smoke:ai:quota:supabase",
    "smoke:ai:stream",
    "rag:bench",
  ]) {
    assert(!pkg.scripts?.[dead], `site-only script leaked into package.json: ${dead}`);
  }
  assert(
    pkg.scripts?.["ai:docs"] === "node scripts/ai-docs.mjs",
    "generated project is missing npm run ai:docs",
  );
  assert(
    pkg.scripts?.["ai:setup"] === "node scripts/ai-setup.mjs",
    "generated project is missing npm run ai:setup",
  );

  const envExample = await read(".env.example");
  assert(
    /LICENSE_GATE=off/.test(envExample),
    "generated project must ship with the download gate OFF",
  );

  // Cloudflare target must use the Workers/OpenNext adapter: the old
  // next-on-pages edge runtime cannot run our Node-runtime route handlers.
  const isCloudflare = config.deploy === "cloudflare";
  assert(
    exists("wrangler.toml") === isCloudflare,
    "wrangler.toml must ship only for the cloudflare deploy target",
  );
  assert(
    exists("open-next.config.ts.example") === isCloudflare,
    "open-next.config.ts.example must ship only for the cloudflare target",
  );
  if (isCloudflare) {
    const wrangler = await read("wrangler.toml");
    assert(
      wrangler.includes('main = ".open-next/worker.js"') &&
        wrangler.includes('"nodejs_compat"') &&
        wrangler.includes(".open-next/assets"),
      "cloudflare wrangler.toml must be an OpenNext Workers config with nodejs_compat",
    );
    assert(
      !wrangler.includes("next-on-pages") && !wrangler.includes("pages_build_output_dir"),
      "cloudflare target must not fall back to the retired Pages adapter",
    );
    const cfReadme = await read("README.md");
    assert(
      cfReadme.includes("SUPABASE_SERVICE_ROLE_KEY") &&
        cfReadme.includes("node:sqlite"),
      "cloudflare README must warn that the local SQLite backend cannot run on Workers",
    );
    const cfPkg = JSON.parse(await read("package.json"));
    assert(
      typeof cfPkg.scripts?.deploy === "string" &&
        cfPkg.scripts.deploy.includes("opennextjs-cloudflare"),
      "cloudflare package.json must expose the OpenNext deploy script",
    );
  }

  // Type-check the generated project with the repository's own TypeScript.
  const tsc = path.join(ROOT, "node_modules", "typescript", "bin", "tsc");
  assert(existsSync(tsc), "typescript not installed — run npm ci first");
  const result = spawnSync(
    process.execPath,
    [tsc, "--noEmit", "-p", path.join(outDir, "tsconfig.json")],
    { cwd: outDir, stdio: "inherit", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } },
  );
  assert(result.status === 0, `tsc --noEmit failed (exit ${result.status})`);
  if (result.error) throw result.error;

  let build = null;
  if (doBuild) {
    build = runBuild(outDir);
    console.log(
      `      build: ${build.sec}s · shared JS ${build.sharedKb ?? "?"} kB · .next ${build.nextKb} kB`,
    );
  }

  return { count, bytes: buf.length, build };
}

const failures = [];
const records = [];
for (const entry of selected) {
  const started = Date.now();
  const doBuild = buildIds.has(entry.id);
  try {
    const { count, bytes, build } = await verifyCase(entry, doBuild);
    records.push({
      id: entry.id,
      status: "pass",
      files: count,
      zipKB: Math.round(bytes / 1024),
      sec: Math.round(((Date.now() - started) / 1000) * 10) / 10,
      build,
    });
    console.log(
      `[PASS] ${entry.id.padEnd(28)} ${String(count).padStart(3)} files  ${(bytes / 1024).toFixed(0)} KB  ${((Date.now() - started) / 1000).toFixed(1)}s${build ? "  (built)" : ""}`,
    );
  } catch (err) {
    failures.push({ id: entry.id, message: err.message });
    records.push({ id: entry.id, status: "fail", message: err.message });
    console.error(`[FAIL] ${entry.id} — ${err.message}`);
  }
}

const passed = selected.length - failures.length;
const report = {
  generatedAt: new Date().toISOString(),
  base: BASE_URL,
  total: selected.length,
  passed,
  passRate: Math.round((passed / selected.length) * 1000) / 10,
  builtCases: records.filter((r) => r.build).length,
  cases: records,
};
await fs.mkdir(OUT_ROOT, { recursive: true });
await fs.writeFile(
  path.join(OUT_ROOT, "report.json"),
  JSON.stringify(report, null, 2),
);
if (PUBLISH) {
  await fs.mkdir(path.join(ROOT, "public"), { recursive: true });
  await fs.writeFile(
    path.join(ROOT, "public", "build-matrix.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(`\nWrote public/build-matrix.json (passRate ${report.passRate}%)`);
}

console.log(
  `\n${passed}/${selected.length} cases passed (base=${BASE_URL})`,
);
if (failures.length) {
  console.error("Failed cases:", failures.map((f) => f.id).join(", "));
  console.error(`Extracted projects are kept in ${OUT_ROOT} for inspection.`);
  process.exit(1);
}
