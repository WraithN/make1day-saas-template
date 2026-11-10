// Structural "promise vs delivery" audit for a generated customer ZIP.
// Usage: node scripts/audit-template.mjs <extracted-zip-dir> <full|min>
// Companion to scripts/verify-matrix.mjs: the matrix proves the ZIP compiles;
// this proves every PROMISED module/skill/doc actually ships (or is pruned)
// for the selection recorded in shipkit.config.json.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const dir = process.argv[2];
const mode = process.argv[3];
const has = (p) => existsSync(path.join(dir, p));
const read = (p) => {
  try {
    return readFileSync(path.join(dir, p), "utf8");
  } catch {
    return "";
  }
};
let fail = 0;
const check = (ok, label) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) fail++;
};

// 鈹€鈹€ Always-shipped promises (both configs) 鈹€鈹€
for (const p of [
  "AGENTS.md",
  "CLAUDE.md",
  "design.md",
  "shipkit.config.json",
  "ai/doc-spec.json",
  "ai/README.md",
  "README.md",
  "LICENSE",
  ".env.example",
  "package.json",
  "middleware.ts",
  "app/login/page.tsx",
  "app/pricing/page.tsx",
  "app/privacy/page.tsx",
  "app/terms/page.tsx",
  "lib/license.ts",
  "lib/paywall.ts",
  "scripts/ai-docs.mjs",
  "scripts/ai-setup.mjs",
  "scripts/agents-lint.mjs",
  "scripts/rebrand.mjs",
  "scripts/export-local-profiles.mjs",
  "scripts/lib/ai-docs.mjs",
]) {
  check(has(p), `ships ${p}`);
}
const pkgScripts = Object.keys(JSON.parse(read("package.json")).scripts ?? {});
for (const s of ["ai:docs", "ai:setup", "agents:lint", "rebrand", "typecheck", "dev", "build"]) {
  check(pkgScripts.includes(s), `package.json script ${s}`);
}
for (const dead of ["smoke", "smoke:gate", "probe:webhook", "rag:bench", "verify:matrix", "waffo:preflight"]) {
  check(!pkgScripts.includes(dead), `no dead script ${dead}`);
}
// agent docs coherence
const agents = read("AGENTS.md");
check(/skills/i.test(agents) && /Scoped rules/i.test(agents), "AGENTS.md mentions skills + scoped rules");
check(read("skills/README.md").includes("frontend"), "skills index lists frontend");

// 鈹€鈹€ Config-specific promises 鈹€鈹€
if (mode === "full") {
  for (const p of [
    "app/rag/page.tsx",
    "app/account/layout.tsx",
    "app/admin/layout.tsx",
    "app/premium/page.tsx",
    "app/dashboard/page.tsx",
    "lib/rag/retrieve.ts",
    "lib/rag/hybrid.ts",
    "lib/org.ts",
    "lib/payments/stripe.ts",
    "supabase/migrations/0007_orgs.sql",
    "supabase/migrations/0002_rag.sql",
  ]) {
    check(has(p), `full: ships ${p}`);
  }
  for (const p of ["lib/payments/waffo.ts", "lib/payments/creem.ts", "lib/payments/paypal.ts", "lib/payments/lemonsqueezy.ts"]) {
    check(!has(p), `full: unselected gateway pruned ${p}`);
  }
  const skillCount = ["frontend-dev", "ui-design", "backend-api", "testing-qa", "seo-content", "auth-security", "payments", "database", "rag", "i18n", "deploy", "agent-workflow", "video"]
    .filter((s) => has(`skills/${s}.md`)).length;
  check(skillCount === 13, `full: 12 skills present (got ${skillCount})`);
  for (const r of ["ai/rules/core.md", "ai/rules/style.md", "ai/rules/payments.md", "ai/rules/rag.md", "ai/rules/account.md", "ai/rules/admin.md"]) {
    check(has(r), `full: rule ${r}`);
  }
  check(/aurora/i.test(read("design.md")), "full: design.md is the aurora palette");
  const envEx = read(".env.example");
  for (const v of ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "EMBEDDING_MODEL"]) {
    check(envEx.includes(v), `full: .env.example documents ${v}`);
  }
  check(read("lib/ai/providers.ts").includes("anthropic"), "full: AI providers wire anthropic");
} else {
  for (const p of ["app/rag/page.tsx", "app/account/layout.tsx", "app/admin/layout.tsx", "app/premium/page.tsx", "app/dashboard/page.tsx", "lib/rag/retrieve.ts"]) {
    check(!has(p), `min: unselected module pruned ${p}`);
  }
  check(has("lib/payments/none.ts"), "min: none-payment stub ships");
  check(!has("lib/payments/stripe.ts"), "min: stripe pruned");
  check(has("skills/frontend-dev.md") && !has("skills/rag.md") && !has("skills/payments.md"), "min: only selected skill ships");
  check(!has("ai/rules/rag.md") && !has("ai/rules/payments.md") && !has("ai/rules/account.md"), "min: conditional rules pruned");
  check(!read(".env.example").includes("STRIPE_SECRET_KEY"), "min: no stripe vars in .env.example");
  check(/mono/i.test(read("design.md")), "min: design.md is the mono palette");
  // dead-link hygiene: no nav/footer references to pruned consoles
  const nav = read("components/Nav.tsx") + read("components/Footer.tsx");
  check(!/href=\{?["']\/(account|admin|rag)/.test(nav), "min: no dead links to pruned routes");
}

// site-only surfaces must never ship
for (const p of ["app/blog/page.tsx", "app/templates/page.tsx", "app/styles/page.tsx", "app/builder/page.tsx", "app/api/generate/route.ts", "app/llms.txt/route.ts", "components/SeoLinks.tsx"]) {
  check(!has(p), `site-only pruned ${p}`);
}
const brand = read("README.md") + read("package.json") + read("app/layout.tsx");
check(!brand.includes("make1day"), "no make1day brand leak in README/package/layout");

console.log(fail === 0 ? `\nSTRUCTURE AUDIT ${mode}: ALL PASS` : `\nSTRUCTURE AUDIT ${mode}: ${fail} FAILURES`);
process.exit(fail === 0 ? 0 : 1);


