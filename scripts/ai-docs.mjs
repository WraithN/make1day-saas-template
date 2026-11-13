#!/usr/bin/env node
/**
 * Rebuild every AI-facing document from ai/doc-spec.json.
 *
 * Run inside a generated project (the ZIP ships this script, the shared
 * renderer and the spec):
 *
 *   npm run ai:docs
 *   node scripts/ai-docs.mjs --dry-run
 *
 * `app-template.config.json` is the SOURCE OF TRUTH for selections; ai/doc-spec.json
 * carries the full option catalogue, palettes and rendering constants. Edit
 * the manifest (or the spec's catalogue) first — never hand-edit AGENTS.md,
 * design.md, ai/rules/*, skills/README.md, .cursor/rules/* or CLAUDE.md,
 * because the next run overwrites them.
 */
import fs from "node:fs";
import path from "node:path";
import { buildDocSet, deriveSpec } from "./lib/ai-docs.mjs";

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const ROOT = process.cwd();
const specPath = path.resolve(ROOT, arg("--spec", "ai/doc-spec.json"));
const dryRun = argv.includes("--dry-run");

if (!fs.existsSync(specPath)) {
  console.error(`Missing ${path.relative(ROOT, specPath)}.`);
  console.error("This command runs inside a generated make1day project.");
  process.exit(1);
}

let spec;
try {
  spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
} catch (err) {
  console.error(`Could not parse ${specPath}: ${err.message}`);
  process.exit(1);
}
if (!spec?.config || !spec?.style || !spec?.labels) {
  console.error("Invalid doc spec: expected { config, style, labels }.");
  process.exit(1);
}

// The Builder manifest wins over the cached config inside doc-spec.json.
// Without this, editing app-template.config.json would NOT change any document.
const manifestPath = path.join(ROOT, "app-template.config.json");
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const picks = manifest.config ?? manifest;
    if (picks && typeof picks === "object") {
      spec.config = { ...spec.config, ...picks };
    }
  } catch (err) {
    console.error(`Could not parse app-template.config.json: ${err.message}`);
    process.exit(1);
  }
}
const effective = deriveSpec(spec, spec.config);
const docs = buildDocSet(effective);
let changed = 0;
let written = 0;
for (const [rel, content] of Object.entries(docs)) {
  const abs = path.join(ROOT, rel);
  const exists = fs.existsSync(abs);
  const before = exists ? fs.readFileSync(abs, "utf8") : "";
  if (before === content) continue;
  changed++;
  if (!dryRun) {
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, "utf8");
    written++;
  }
}

const rules = Object.keys(docs).filter(
  (k) => k.startsWith("ai/rules/") && k.endsWith(".md") && !k.endsWith("README.md"),
).length;
const cursor = Object.keys(docs).filter((k) => k.startsWith(".cursor/rules/")).length;

console.log(
  `${dryRun ? "[dry-run] " : ""}ai:docs — ${Object.keys(docs).length} documents, ` +
    `${rules} scoped rules, ${cursor} Cursor rules, ${effective.labels.skills.length} skills (source: app-template.config.json)`,
);
console.log(
  dryRun
    ? `${changed} file(s) would change. No files written.`
    : `${written} file(s) written (${changed} changed). Unchanged files were left untouched.`,
);
if (!dryRun) {
  console.log("Next: npx tsc --noEmit && npm run build");
}
