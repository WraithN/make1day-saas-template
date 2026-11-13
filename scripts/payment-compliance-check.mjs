#!/usr/bin/env node
// Payment compliance self-check - reads contracts/payment-compliance.json
// and audits THIS project against every selected gateway's machine-readable
// contract. Run: `npm run compliance:check` (optionally --url https://… to
// also probe the public terms/privacy pages).
//
// Exit codes: 0 = no FAILs (WARNs allowed), 1 = at least one FAIL.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const exists = (p) => fs.existsSync(path.join(root, p));
const args = process.argv.slice(2);
const siteUrl = (args.find((a) => a.startsWith("--url=")) || "").replace("--url=", "") || null;

let contract;
try {
  contract = JSON.parse(fs.readFileSync(path.join(root, "contracts/payment-compliance.json"), "utf8"));
} catch {
  console.error("contracts/payment-compliance.json missing - the compliance skill is not bundled in this build.");
  process.exit(1);
}

// Which gateways does this checkout actually enable? Generated projects get
// an index with ONLY the selected adapters; the operator site (this repo)
// wires all adapters and selects at runtime via PAYMENT_PROVIDER.
let enabled = [];
try {
  const idx = fs.readFileSync(path.join(root, "lib/payments/index.ts"), "utf8");
  for (const g of Object.keys(contract.gateways)) {
    if (idx.includes(`${g}Provider`) || idx.includes(`"./${g}"`)) enabled.push(g);
  }
  if (!process.env.PAYMENT_PROVIDER) {
    // operator repo: honor the runtime selection like the app itself does
    const envSrc = exists(".env.local") ? fs.readFileSync(path.join(root, ".env.local"), "utf8") : "";
    const m = /PAYMENT_PROVIDER\s*=\s*([^\s"']+)/.exec(envSrc);
    const runtime = m ? m[1] : null;
    if (runtime) {
      const names = runtime.split(",").map((s) => s.trim());
      enabled = enabled.filter((g) => names.includes(g));
      if (names.includes("none")) enabled = [];
    }
  }
  // an adapter only counts if its source file is really in this build
  enabled = enabled.filter((g) => exists(`lib/payments/${g}.ts`) || g === "none");
} catch {
  console.error("lib/payments/index.ts not found - cannot detect gateways.");
  process.exit(1);
}

const results = [];
const add = (sev, msg) => results.push({ sev, msg });

// ── common checks ──────────────────────────────────────────────────────────
for (const f of [contract.common.webhookRoute, contract.common.checkoutRoute]) {
  exists(f) ? add("PASS", `${f} present`) : add("FAIL", `${f} MISSING`);
}
const readme = exists("README.md") ? fs.readFileSync(path.join(root, "README.md"), "utf8") : "";
/refund/i.test(readme) ? add("PASS", "README mentions refund policy") : add("WARN", "no refund policy text found in README");

const webhookSrc = exists(contract.common.webhookRoute)
  ? fs.readFileSync(path.join(root, contract.common.webhookRoute), "utf8")
  : "";
if (/verifyWebhook|verify.*signature|rawBody/i.test(webhookSrc)) {
  add("PASS", "webhook verifies signatures on the raw body before business logic");
} else if (enabled.length) {
  add("FAIL", "webhook route does not visibly verify signatures (verify before any grant!)");
}

// ── per-gateway checks ─────────────────────────────────────────────────────
const envBlob = [
  exists(".env.example") ? fs.readFileSync(path.join(root, ".env.example"), "utf8") : "",
  exists(".env.local") ? fs.readFileSync(path.join(root, ".env.local"), "utf8") : "",
].join("\n");

for (const g of enabled) {
  const spec = contract.gateways[g];
  add("INFO", `── ${g}: ${spec.webhookSignature.split("(")[0].trim()}`);
  const missing = (spec.requiredEnv || []).filter((v) => {
    const name = v.split(" ")[0];
    return !envBlob.includes(name);
  });
  if (missing.length) add("WARN", `${g} env vars not documented in .env.example: ${missing.join(", ")}`);
  else add("PASS", `${g} required env vars are documented`);
}

// ── live probes (optional) ─────────────────────────────────────────────────
if (siteUrl) {
  for (const p of [contract.common.termsUrl, contract.common.privacyUrl]) {
    try {
      const r = await fetch(siteUrl.replace(/\/$/, "") + p, { signal: AbortSignal.timeout(15000), redirect: "follow" });
      r.ok ? add("PASS", `${p} reachable (${r.status})`) : add("FAIL", `${p} returned ${r.status}`);
    } catch (e) {
      add("WARN", `${p} probe failed: ${e.message}`);
    }
  }
} else {
  add("INFO", "pass --url=https://your-domain to probe /terms and /privacy live");
}

// ── report ──────────────────────────────────────────────────────────────────
let fails = 0;
let warns = 0;
for (const r of results) {
  if (r.sev === "FAIL") fails++;
  if (r.sev === "WARN") warns++;
  console.log(`${r.sev.padEnd(4)} │ ${r.msg}`);
}
console.log(`\ncompliance: ${enabled.length ? enabled.join(", ") : "no gateway detected"} · ${results.length} checks · ${fails} fail · ${warns} warn`);
if (!enabled.length) {
  console.log("NOTE: no payment gateway detected in lib/payments/index.ts - checkout is 'none'.");
}
process.exit(fails ? 1 : 0);
