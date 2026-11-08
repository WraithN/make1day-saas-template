// White-label / rebrand helper for make1day-generated projects.
//
// Replaces the make1day product name (and legacy ShipKit / ShipYourProduct /
// Uncorne strings that may survive in older downloads) with your own brand
// across every text file in a target directory. Wire-level identifiers such as
// `shipkit.config.json`, `sk_*` cookies, `SK1.` key prefixes and the
// `X-ShipKit-Entitlement` header are intentionally NOT rewritten — renaming
// them would break already-issued license keys.
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
      "  Brand: new product name (replaces \"make1day\" and legacy brand words)\n" +
      "  Owner: copyright holder; defaults to Brand\n" +
      "  dir:   target directory (default: current directory)",
  );
  process.exit(1);
}

const BRAND = brandArg;
const OWNER = ownerArg || brandArg;
const ROOT = path.resolve(dirArg || ".");

const SKIP_DIRS = new Set([
  "node_modules", ".next", ".git", ".vercel", ".workbuddy", "dist", "build",
]);

const TEXT_EXT = new Set([
  ".ts", ".tsx", ".js", ".mjs", ".cjs",
  ".json", ".md", ".txt", ".css", ".scss",
  ".toml", ".yml", ".yaml", ".html", ".mdx",
  ".py", ".sql",
]);

// Wire contracts: renamed only by a deliberate key rotation, never by a
// cosmetic rebrand.
const KEEP = [
  "X-ShipKit-Entitlement",
  "x-shipkit-license",
  "shipkit.config.json",
  "shipkit.db",
  "SK1.",
];

/** The generated project's own name is the default word to replace. */
function projectBrand() {
  try {
    const cfg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "shipkit.config.json"), "utf8"),
    );
    return cfg?.config?.appName ?? "";
  } catch {
    return "";
  }
}

const BRAND_WORDS = [
  projectBrand(),
  "ShipYourProduct",
  "ShipKit",
  "Uncorne",
].filter(Boolean);
const DOMAINS = ["make1day.com", "shipkit.dev", "uncorne.com"];

function isTextFile(file) {
  if (file === "LICENSE") return true;
  return TEXT_EXT.has(path.extname(file).toLowerCase()) || file.startsWith(".env");
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
  const before = text;
  const tokens = KEEP.map((literal, i) => [`@@KEEP${i}@@`, literal]);
  for (const [token, literal] of tokens) text = text.split(literal).join(token);

  // Domains first: they contain the brand word and would otherwise be mangled.
  const replacementDomain = `${BRAND.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example`;
  for (const domain of DOMAINS) text = text.split(domain).join(replacementDomain);
  for (const word of BRAND_WORDS) {
    text = text.split(word).join(word === "Uncorne" ? OWNER : BRAND);
  }
  for (const [token, literal] of tokens) text = text.split(token).join(literal);

  if (text === before) return 0;
  fs.writeFileSync(abs, text, "utf8");
  return BRAND_WORDS.reduce((n, w) => n + (before.split(w).length - 1), 0);
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

console.log(`Rebranding "${ROOT}"\n  make1day (+ legacy names) → ${BRAND}\n  owner → ${OWNER}\n`);
const [files, occurrences] = walk(ROOT);
console.log(`\nDone: ${files} files, ${occurrences} replacements.`);
console.log("Next: review changes, update LICENSE copyright line if needed, then commit.");
