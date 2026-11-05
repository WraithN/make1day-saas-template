// White-label / rebrand helper for ShipKit-generated projects.
//
// Replaces the ShipKit product name and the Uncorne copyright/owner strings
// across every text file in a target directory. It only touches the capitalised
// brand words ("ShipKit", "Uncorne") on purpose — the config filename
// `shipkit.config.json` and lowercase repo URLs are left intact so nothing breaks.
//
// Usage:
//   node scripts/rebrand.mjs "My SaaS"            # brand = "My SaaS", owner = "My SaaS"
//   node scripts/rebrand.mjs "My SaaS" "Acme Inc" # brand + explicit owner
//   node scripts/rebrand.mjs "My SaaS" "Acme Inc" ./my-project   # target a folder
//
// Safe to re-run. Prints how many files and occurrences changed.

import fs from "node:fs";
import path from "node:path";

const [, , brandArg, ownerArg, dirArg] = process.argv;

if (!brandArg) {
  console.error(
    "Usage: node scripts/rebrand.mjs \"<Brand>\" [Owner] [dir]\n" +
      "  Brand: new product name (replaces \"ShipKit\")\n" +
      "  Owner: copyright holder (replaces \"Uncorne\"); defaults to Brand\n" +
      "  dir:   target directory (default: current directory)",
  );
  process.exit(1);
}

const BRAND = brandArg;
const OWNER = ownerArg || brandArg;
const ROOT = path.resolve(dirArg || ".");

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".vercel",
  ".workbuddy",
  "dist",
  "build",
]);

// Only rewrite these text extensions; everything else (images, fonts, binaries)
// is left alone.
const TEXT_EXT = new Set([
  ".ts", ".tsx", ".js", ".mjs", ".cjs",
  ".json", ".md", ".txt", ".css", ".scss",
  ".toml", ".yml", ".yaml", ".html", ".mdx",
  ".env", ".env.example",
]);

const SELF = path.resolve(import.meta.url);

function isTextFile(file) {
  if (file === "LICENSE") return true; // MIT text, safe to rewrite
  const ext = path.extname(file).toLowerCase();
  return TEXT_EXT.has(ext);
}

function rewriteFile(abs) {
  const rel = path.relative(ROOT, abs);
  if (rel === "scripts/rebrand.mjs") return 0; // never rewrite this script
  let text;
  try {
    text = fs.readFileSync(abs, "utf8");
  } catch {
    return 0;
  }
  if (!text.includes("ShipKit") && !text.includes("Uncorne")) return 0;
  const next = text
    .split("ShipKit")
    .join(BRAND)
    .split("Uncorne")
    .join(OWNER);
  if (next === text) return 0;
  fs.writeFileSync(abs, next, "utf8");
  return (text.match(/ShipKit/g)?.length || 0) + (text.match(/Uncorne/g)?.length || 0);
}

function walk(dir) {
  let filesChanged = 0;
  let occ = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const [f, o] = walk(abs);
      filesChanged += f;
      occ += o;
    } else if (entry.isFile() && isTextFile(entry.name)) {
      const n = rewriteFile(abs);
      if (n > 0) {
        filesChanged += 1;
        occ += n;
        console.log(`  ${path.relative(ROOT, abs)}  (${n})`);
      }
    }
  }
  return [filesChanged, occ];
}

console.log(`Rebranding "${ROOT}"\n  ShipKit → ${BRAND}\n  Uncorne → ${OWNER}\n`);
const [files, occurrences] = walk(ROOT);
console.log(`\nDone: ${files} files, ${occurrences} replacements.`);
console.log("Next: review changes, update LICENSE copyright line if needed, then commit.");
