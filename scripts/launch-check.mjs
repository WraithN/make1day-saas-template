#!/usr/bin/env node
// launch-check - "is this build actually ready to go live?"
//
//   npm run launch:check            human table
//   npm run launch:check -- --json  machine-readable (for agents/CI)
//
// Reads .env.local (then process.env) and the project's own config files,
// then verifies the things that silently break a launch: the site URL baked
// at build time, a payment gateway that is selected but not configured (or
// still in TEST mode against a real domain), Supabase persistence, the admin
// credentials, mail delivery, AI keys, cron secret, and leftover placeholder
// branding. FAIL items must be fixed before launch; WARN items are honest
// degraded modes you may accept deliberately.
//
// Exit codes: 0 = no FAIL, 1 = at least one FAIL.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const jsonMode = process.argv.includes("--json");

function loadEnvFile(name) {
  const out = new Map();
  const p = path.join(root, name);
  if (!fs.existsSync(p)) return out;
  for (const l of fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n").split("\n")) {
    const m = /^\s*(?:#)?\s*([A-Z][A-Z0-9_]*)=(.*)$/.exec(l);
    if (m && !l.trim().startsWith("#")) out.set(m[1], m[2].trim());
  }
  return out;
}

const envFile = loadEnvFile(".env.local");
const env = (name) => envFile.get(name) ?? process.env[name] ?? "";

const config = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, "app-template.config.json"), "utf8"));
  } catch {
    return null;
  }
})();

const results = [];
const add = (sev, id, msg, fix) => results.push({ sev, id, msg, fix });

// ── 1. site URL (build-time baked) ─────────────────────────────────────────
const siteUrl = env("NEXT_PUBLIC_SITE_URL");
if (!siteUrl) {
  add("FAIL", "site-url", "NEXT_PUBLIC_SITE_URL is unset - canonical URLs, sitemap, checkout successUrl and llms.txt all bake to localhost at BUILD time.", "Set NEXT_PUBLIC_SITE_URL=https://your.domain BEFORE the first production build.");
} else if (/localhost|127\.0\.0\.1/.test(siteUrl)) {
  add("FAIL", "site-url", `NEXT_PUBLIC_SITE_URL still points at ${siteUrl}.`, "Set the real production domain and rebuild.");
} else if (/\.vercel\.app$|\.vercel\.app\//.test(siteUrl)) {
  add("WARN", "site-url", `Site URL is the temporary ${siteUrl} - checkout webhooks and legal pages will move when the custom domain lands.`, "Switch to the custom domain before marketing the product.");
} else {
  add("PASS", "site-url", `Site URL: ${siteUrl}`);
}
const isRealDomain = !!siteUrl && !/localhost|127\.0\.0\.1/.test(siteUrl);

// ── 2. payment gateway ──────────────────────────────────────────────────────
const provider = (env("PAYMENT_PROVIDER") || "waffo").split(",")[0].trim().toLowerCase();
const NEEDS = {
  waffo: ["WAFFO_PRICE_ID_BUYOUT", "WAFFO_PRICE_ID_CARE"],
  stripe: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_ID_BUYOUT", "STRIPE_PRICE_ID_CARE"],
  creem: ["CREEM_API_KEY", "CREEM_WEBHOOK_SECRET", "CREEM_PRICE_ID_BUYOUT", "CREEM_PRICE_ID_CARE"],
  paypal: ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_PLAN_ID_BUYOUT", "PAYPAL_PLAN_ID_CARE"],
  lemonsqueezy: ["LEMONSQUEEZY_API_KEY", "LEMONSQUEEZY_WEBHOOK_SECRET", "LEMONSQUEEZY_VARIANT_ID_BUYOUT", "LEMONSQUEEZY_VARIANT_ID_CARE"],
};
if (provider === "none") {
  add("WARN", "payment", "PAYMENT_PROVIDER=none - checkout is disabled by design (bring your own billing).", null);
} else {
  const missing = (NEEDS[provider] || []).filter((k) => !env(k));
  if (missing.length) {
    add("FAIL", "payment", `PAYMENT_PROVIDER=${provider} but these are unset: ${missing.join(", ")}`, "Fill them (see .env.example) - checkout would 500 at the first customer.");
  } else {
    add("PASS", "payment", `${provider} wired: all product/env ids present`);
  }
  if (provider === "waffo" && isRealDomain && env("WAFFO_ENVIRONMENT") === "test") {
    add("FAIL", "payment-env", "A real production domain with WAFFO_ENVIRONMENT=test - you would serve test checkout to paying visitors.", "Flip WAFFO_ENVIRONMENT=prod and swap the PROD_ product ids + WAFFO_WEBHOOK_PUBLIC_KEY_PROD.");
  }
  if (["creem", "stripe"].includes(provider) && isRealDomain && /test/i.test(env(`${provider.toUpperCase()}_ENV`))) {
    add("WARN", "payment-env", `${provider} still in test mode against a production domain.`, "Switch to live keys when you launch.");
  }
}

// ── 3. persistence ──────────────────────────────────────────────────────────
const supaUrl = env("NEXT_PUBLIC_SUPABASE_URL");
const supaAnon = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
if (!supaUrl || !supaAnon) {
  add(isRealDomain ? "FAIL" : "WARN", "supabase", "Supabase is not configured - accounts/licenses live in local SQLite, which is LOST on every serverless cold start.", isRealDomain ? "On Vercel/Cloudflare this is mandatory: set URL + anon key, run all migrations." : "For a real deploy you must configure Supabase and apply ALL migrations (npx supabase db push).");
} else if (!env("SUPABASE_SERVICE_ROLE_KEY")) {
  add("WARN", "supabase", "URL+anon set but no SUPABASE_SERVICE_ROLE_KEY - webhook persistence and admin views run degraded.", "Add the service role key (server-only).");
} else {
  add("PASS", "supabase", "URL + anon + service role configured");
}

// ── 4. admin console ────────────────────────────────────────────────────────
if (!env("ADMIN_USER") || !env("ADMIN_PASSWORD")) {
  add("WARN", "admin", "/admin stays CLOSED (fail-closed default - secure, but you cannot operate yet).", "Set ADMIN_USER/ADMIN_PASSWORD (strong password!) or ADMIN_EMAILS with Supabase roles.");
} else if (/^(admin|password|123456|changeme)$/i.test(env("ADMIN_PASSWORD"))) {
  add("FAIL", "admin", "ADMIN_PASSWORD is a trivial guess and /admin moves money and users.", "Generate a real secret.");
} else {
  add("PASS", "admin", "admin credentials set");
}

// ── 5. mail delivery ────────────────────────────────────────────────────────
const mail = (env("MAIL_PROVIDER") || "none").toLowerCase();
if (mail === "none") {
  add("FAIL", "mail", "MAIL_PROVIDER=none - license keys and receipts are LOGGED, never SENT. Paying customers would wait for email that never arrives.", "Configure resend (MAIL_PROVIDER=resend + RESEND_API_KEY) or your webhook mailer.");
} else if (mail === "resend" && !env("RESEND_API_KEY")) {
  add("FAIL", "mail", "MAIL_PROVIDER=resend but RESEND_API_KEY is unset.", "Add the key (resend.com/api-keys) and verify the sending domain (SPF/DKIM).");
} else {
  add("PASS", "mail", `mail provider: ${mail}`);
}

// ── 6. AI surfaces ──────────────────────────────────────────────────────────
if (env("SHOW_AI_SURFACES") !== "false") {
  const anyKey = ["OPENAI", "ANTHROPIC", "GEMINI", "GROQ", "DEEPSEEK", "OPENROUTER"].some((k) => env(`${k}_API_KEY`));
  if (!anyKey) {
    add("WARN", "ai", "No AI provider key found - /api/ai answers with the built-in demo reply (clearly labelled, but not a real model).", "Set at least one *_API_KEY, or hide the surface with SHOW_AI_SURFACES=false.");
  } else {
    add("PASS", "ai", "at least one AI provider key set");
  }
}

// ── 7. cron + secrets ───────────────────────────────────────────────────────
if (!env("CRON_SECRET")) {
  add("WARN", "cron", "CRON_SECRET unset - /api/cron/* (mail retry, retention) cannot be scheduled safely.", "Set a secret and wire your host scheduler (Vercel cron jobs / Cloudflare Cron Triggers).");
}
if (isRealDomain && !env("LICENSE_SECRET") && (env("LICENSE_GATE") || "auto") !== "off") {
  add("WARN", "license", "LICENSE_SECRET unset on a production domain - the offline key gate cannot verify anything.", "Set LICENSE_SECRET (and keep it OUT of git).");
}

// ── 8. placeholder branding ─────────────────────────────────────────────────
if (config && config.appName === "my-saas") {
  add("WARN", "brand", "app-name is still the placeholder 'my-saas' (check app-template.config.json / package.json name).", "Rename to your product before launch.");
}
const contact = env("NEXT_PUBLIC_CONTACT_EMAIL") + env("NEXT_PUBLIC_SUPPORT_EMAIL") + env("SUPPORT_EMAIL");
if (/example\.com/i.test(contact)) {
  add("FAIL", "contact", "Contact/support address is still an example.com placeholder - it appears on /privacy, /terms and receipts.", "Set the real monitored mailbox in env.");
} else if (!contact && isRealDomain) {
  add("WARN", "contact", "No contact email configured - legal pages fall back to placeholders.", "Set NEXT_PUBLIC_CONTACT_EMAIL (and the support mailbox).");
}

// ── report ──────────────────────────────────────────────────────────────────
const fails = results.filter((r) => r.sev === "FAIL");
const warns = results.filter((r) => r.sev === "WARN");
if (jsonMode) {
  console.log(JSON.stringify({ ok: fails.length === 0, fails: fails.length, warns: warns.length, results }, null, 2));
} else {
  console.log("\nlaunch-check\n");
  for (const r of results) {
    console.log(` ${r.sev.padEnd(4)} ${r.msg}`);
    if (r.fix) console.log(`      ↳ ${r.fix}`);
  }
  console.log(`\n${fails.length} fail · ${warns.length} warn - launch is ${fails.length ? "NOT ready" : "READY (fix or accept warnings)"}.`);
  console.log("Then: npm run compliance:check --url=" + (siteUrl || "https://your.domain") + " and npm run verify:matrix for payments-side gates.");
}
process.exit(fails.length ? 1 : 0);
