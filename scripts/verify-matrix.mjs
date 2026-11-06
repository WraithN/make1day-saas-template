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
 * Requires a running ShipKit dev server with the license gate OFF:
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
  payment: "waffo",
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

// 16 representative combinations: all 5 payment choices, all 10 styles,
// all 3 deploy targets, RAG on/off, dashboard on/off, both consoles on/off
// and each console alone, multitenancy on/off, skills empty/full,
// auth/AI provider variations.
const CASES = [
  { id: "default-waffo-midnight", config: c({}) },
  { id: "stripe-candy", config: c({ payment: "stripe", style: "candy" }) },
  { id: "creem-aurora", config: c({ payment: "creem", style: "aurora" }) },
  { id: "paypal-paper", config: c({ payment: "paypal", style: "paper" }) },
  { id: "none-mono", config: c({ payment: "none", style: "mono" }) },
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
      payment: "stripe",
      style: "candy",
      features: ["landing", "dashboard", "rag"],
      skills: ["seo"],
    }),
  },
  {
    id: "none-slate-multitenancy",
    config: c({
      payment: "none",
      style: "slate",
      features: ["landing", "dashboard", "multitenancy"],
    }),
  },
  {
    id: "creem-mono-all-skills",
    config: c({ payment: "creem", style: "mono", skills: ALL_SKILLS }),
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
  "app/agent-ready/page.tsx",
  "lib/content/agent-ready.ts",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

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
  const res = spawnSync(
    process.execPath,
    [nextBin, "build"],
    {
      cwd: outDir,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", NODE_ENV: "production" },
      maxBuffer: 32 * 1024 * 1024,
    },
  );
  const log = `${res.stdout ?? ""}${res.stderr ?? ""}`.toString();
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
  ]) {
    assert(exists(rel), `missing ${rel}`);
  }
  // The legacy lowercase name must be gone: on case-insensitive filesystems
  // (Windows) it would collide with the standard root AGENTS.md.
  assert(!exists("agents.md"), "legacy agents.md leaked into ZIP");

  // White-label: every generated project must ship an MIT LICENSE file.
  assert(exists("LICENSE"), "LICENSE missing from ZIP");

  // Site-only endpoints must never leak into a customer project.
  for (const rel of SITE_ONLY_FILES) {
    assert(!exists(rel), `site-only endpoint leaked into ZIP: ${rel}`);
  }

  // Payment pruning: only the selected adapter survives.
  for (const [name, rel] of Object.entries(PAYMENT_FILES)) {
    if (config.payment === "none" || name !== config.payment) {
      assert(!exists(rel), `unselected adapter shipped: ${rel}`);
    } else {
      assert(exists(rel), `selected adapter missing: ${rel}`);
    }
  }
  assert(
    exists("lib/payments/none.ts") === (config.payment === "none"),
    "none.ts stub must exist only for payment=none",
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
  const expectedRules =
    7 + (config.payment !== "none" ? 1 : 0) +
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
    Object.keys(docSpec.catalog?.styles ?? {}).length === 10,
    "doc-spec catalogue must contain all 10 palettes",
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
  assert(picks.payment === config.payment, "manifest.config.payment mismatch");
  assert(picks.deploy === config.deploy, "manifest.config.deploy mismatch");

  const pkg = JSON.parse(await read("package.json"));
  assert(pkg.name === "matrix-app", `package name mismatch: ${pkg.name}`);
  assert(!pkg.scripts?.["waffo:preflight"], "site-only script leaked into package.json");
  assert(!pkg.scripts?.["verify:matrix"], "site-only script leaked into package.json");
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
