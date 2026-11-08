#!/usr/bin/env node
/**
 * One-command adaptation for Cursor and Claude Code.
 *
 *   npm run ai:setup                     # both tools (default)
 *   npm run ai:setup -- --tool cursor   # .cursor/rules/*.mdc only
 *   npm run ai:setup -- --tool claude   # CLAUDE.md only
 *   npm run ai:setup -- --dry-run
 *
 * `ai:docs` refreshes these files too, so a config change stays in sync with
 * whatever your AI tool reads. No network access, no dependencies.
 */
import fs from "node:fs";
import path from "node:path";
import { buildDocSet, deriveSpec, isToolFile } from "./lib/ai-docs.mjs";

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const tool = arg("--tool", "all");
if (!["all", "cursor", "claude"].includes(tool)) {
  console.error(`Unknown --tool "${tool}". Use all | cursor | claude.`);
  process.exit(1);
}
const dryRun = argv.includes("--dry-run");
const ROOT = process.cwd();
const specPath = path.join(ROOT, "ai/doc-spec.json");

if (!fs.existsSync(specPath)) {
  console.error("Missing ai/doc-spec.json — run this inside a generated make1day project.");
  process.exit(1);
}
const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
// Same source-of-truth rule as ai:docs — the Builder manifest wins.
const manifestPath = path.join(ROOT, "shipkit.config.json");
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  spec.config = { ...spec.config, ...(manifest.config ?? manifest) };
}
const docs = buildDocSet(deriveSpec(spec, spec.config));

let written = 0;
for (const [rel, content] of Object.entries(docs)) {
  if (!isToolFile(rel)) continue;
  if (tool === "cursor" && !rel.startsWith(".cursor/rules/")) continue;
  if (tool === "claude" && rel !== "CLAUDE.md") continue;
  const abs = path.join(ROOT, rel);
  if (fs.existsSync(abs) && fs.readFileSync(abs, "utf8") === content) continue;
  if (!dryRun) {
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, "utf8");
  }
  written++;
}

const cursor = Object.keys(docs).filter((k) => k.startsWith(".cursor/rules/")).length;
console.log(
  `${dryRun ? "[dry-run] " : ""}ai:setup — tool=${tool}, ${written} file(s) ${dryRun ? "would be written" : "written"}`,
);
if (tool !== "claude") console.log(`  Cursor: .cursor/rules/*.mdc (${cursor} scoped rules)`);
if (tool !== "cursor") console.log("  Claude Code: CLAUDE.md (imports AGENTS.md + design.md + rules)");
console.log("  Root contract: AGENTS.md — no extra configuration required for Codex / other agents.");
