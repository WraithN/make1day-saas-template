// One-off: replace leftover visible "SHIPKIT …" UI brand strings in i18n with
// "make1day …". These are human-readable eyebrow labels (blog/builder), NOT the
// protected wire identifiers (X-ShipKit-Entitlement / shipkit.db / sk_* / SK1).
// The customer generator already rewrites "make1day" -> appName, so this keeps
// white-labeling intact.
import fs from "node:fs";
import path from "node:path";

const file = path.resolve("lib/i18n-core.ts");
let s = fs.readFileSync(file, "utf8");

const subs = [
  // builder: "SHIPKIT BUILDER" is a substring of the banner prefixes too
  // (NEW · / NOUVEAU · / NEU · SHIPKIT BUILDER), so one replace covers both
  // the page eyebrow and the banner in en/fr/de.
  ["SHIPKIT BUILDER", "make1day BUILDER"],
  ["SHIPKIT 生成器", "make1day 生成器"], // zh page + banner substring
  ["SHIPKIT ビルダー", "make1day ビルダー"], // ja page + banner substring
  ["SHIPKIT BLOG", "make1day BLOG"],
  ["SHIPKIT 博客", "make1day 博客"],
  ["SHIPKIT-BLOG", "make1day-BLOG"],
];

let total = 0;
for (const [from, to] of subs) {
  const re = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
  const before = s;
  s = s.replace(re, to);
  const n = (before.match(re) || []).length;
  total += n;
  console.log(`  ${from} -> ${to}: ${n}`);
}
fs.writeFileSync(file, s, "utf8");
console.log("TOTAL replacements:", total);
