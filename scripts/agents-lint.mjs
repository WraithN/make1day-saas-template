#!/usr/bin/env node
/**
 * AGENTS.md / scoped-rule contract linter.
 *
 * Until now the AI-coding contract was only prose: a customer could delete a
 * rule, regenerate docs from a stale spec, or re-introduce the operator's
 * brand and nothing would fail. `npm run agents:lint` makes the contract
 * machine-checkable. It runs in two modes:
 *
 *   generated project  (ai/doc-spec.json exists)  → full contract check
 *   operator repo      (no ai/doc-spec.json)      → root AGENTS.md check
 *
 * Exit code 0 = pass, 1 = at least one violation. No dependencies.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const warnings = [];
const read = (rel) => {
  const p = path.join(root, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
};
const list = (dir) => {
  const p = path.join(root, dir);
  if (!fs.existsSync(p)) return [];
  return fs.readdirSync(p, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.posix.join(dir, e.name));
};
const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

// Wire-level identifiers are deliberately kept for compatibility. Everything
// else that names the operator's product must not appear in a customer project.
// Competitor names are intentionally NOT here — a generated project may mention
// competitors in its own copy, and "brand leak" only means OUR product.
const BRANDS = ["ShipKit", "ShipYourProduct", "Uncorne", "marketit"];
const KEEP_WIRE = /X-ShipKit-Entitlement|shipkit\.config\.json|x-shipkit-license|shipkit\.db|SK1\./;

const generated = read("ai/doc-spec.json") !== null;

// ── Root contract, both modes ────────────────────────────────────────────
const agents = read("AGENTS.md");
if (!agents) {
  fail("AGENTS.md is missing");
} else {
  const requiredSections = generated
    ? ["What this build contains", "Commands", "Repository map", "Non-negotiable rules", "Definition of done"]
    : ["What lives here", "Commands", "Non-negotiable rules", "Definition of done"];
  for (const section of requiredSections) {
    if (!agents.toLowerCase().includes(section.toLowerCase())) {
      fail(`AGENTS.md is missing the "${section}" section`);
    }
  }
  if (!/api\/webhook/.test(agents)) {
    fail("AGENTS.md must document the single /api/webhook payment rule");
  }
  if (generated && !agents.includes("npm run agents:lint")) {
    fail("generated AGENTS.md must require `npm run agents:lint` before done");
  }
  if (generated) {
    for (const brand of BRANDS) {
      const leaked = agents
        .split("\n")
        .filter((l) => l.includes(brand) && !KEEP_WIRE.test(l));
      if (leaked.length) fail(`AGENTS.md leaks operator branding: ${brand}`);
    }
    if (!/LICENSE_GATE/.test(read("lib/env.ts") ?? "")) {
      fail("generated project must ship lib/env.ts with the license gate default");
    }
  }
}

if (!generated) {
  // Operator repo: the generator-owned contract files must still be present.
  for (const rel of ["lib/generator/prune.ts", "scripts/lib/ai-docs.mjs"]) {
    if (read(rel) === null) fail(`operator repo is missing ${rel}`);
  }
}

// ── Generated-project contract ───────────────────────────────────────────
if (generated) {
  for (const rel of [
    "design.md",
    "CLAUDE.md",
    "ai/doc-spec.json",
    "ai/README.md",
    "ai/rules/core.md",
    ".cursor/rules/core.mdc",
    "skills/README.md",
    "shipkit.config.json",
  ]) {
    if (read(rel) === null) fail(`missing agent contract file: ${rel}`);
  }

  const design = read("design.md") ?? "";
  if (!/--bg|--surface|--accent/.test(design)) {
    fail("design.md has no locked CSS design tokens");
  }
  if (!/#[0-9a-f]{3,8}/i.test(design)) {
    warn("design.md has no hex colour references");
  }

  // Every scoped rule must carry frontmatter with globs, otherwise an agent
  // cannot tell which files the rule applies to.
  const rules = list("ai/rules").filter((f) => f.endsWith(".md") && !f.endsWith("README.md"));
  if (rules.length === 0) fail("no scoped rules were generated");
  for (const rel of rules) {
    const src = read(rel) ?? "";
    if (!/^---[\s\S]*?globs:/m.test(src)) {
      fail(`${rel} has no frontmatter with globs`);
    }
  }

  // The skills index must list every shipped playbook.
  const skills = list("skills").filter((f) => f.endsWith(".md") && !f.endsWith("README.md"));
  const index = read("skills/README.md") ?? "";
  for (const rel of skills) {
    const name = path.basename(rel, ".md");
    if (!index.includes(name)) fail(`skills/README.md does not index ${name}`);
  }

  // Brand sweep over every agent-facing document.
  const docs = [
    "AGENTS.md", "design.md", "CLAUDE.md", "ai/README.md",
    "skills/README.md", ".cursor/rules/core.mdc",
    "ai/rules/core.md", "ai/doc-spec.json",
    ...rules,
    ...list("skills").filter((f) => f.endsWith(".md")),
    ...list(".cursor/rules").filter((f) => f.endsWith(".mdc")),
  ];
  for (const rel of docs) {
    const src = read(rel);
    if (src === null) continue;
    for (const brand of BRANDS) {
      const leaked = src
        .split("\n")
        .filter((l) => l.includes(brand) && !KEEP_WIRE.test(l));
      if (leaked.length) fail(`${rel} leaks operator branding: ${brand}`);
    }
  }

  // Spec must be valid JSON and name the selected modules.
  try {
    const spec = JSON.parse(read("ai/doc-spec.json"));
    if (!spec.config || typeof spec.config !== "object") {
      fail("ai/doc-spec.json has no config object");
    }
  } catch {
    fail("ai/doc-spec.json is not valid JSON");
  }
}

// ── Report ───────────────────────────────────────────────────────────────
console.log(`agents:lint — ${generated ? "generated project" : "operator repo"}`);
for (const w of warnings) console.log(`  WARN  ${w}`);
for (const e of errors) console.log(`  FAIL  ${e}`);
if (errors.length) {
  console.error(`agents:lint failed: ${errors.length} violation(s)`);
  process.exit(1);
}
console.log(`agents:lint passed (${warnings.length} warning(s))`);
