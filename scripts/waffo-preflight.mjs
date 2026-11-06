#!/usr/bin/env node
/**
 * Waffo Pancake go-live preflight — STATIC configuration check only.
 *
 *   node scripts/waffo-preflight.mjs
 *   node scripts/waffo-preflight.mjs --strict              # WARN also fails
 *   node scripts/waffo-preflight.mjs --env .env.production.local
 *
 * It never makes a network request and never prints secret values (only
 * "<set: N chars>"). It also does NOT prove that Waffo can actually charge a
 * card — run a real test payment per docs/waffo-launch-checklist.md.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const strict = argv.includes("--strict");
const envIdx = argv.indexOf("--env");
const envArg = envIdx >= 0 && argv[envIdx + 1] ? argv[envIdx + 1] : ".env.local";
const envPath = path.isAbsolute(envArg) ? envArg : path.join(ROOT, envArg);

const PLACEHOLDER = /REPLACE_ME|your-|PROD_xxx|sk-xxx|G-XXXXXXX|change-me|^xxx$/i;

function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmed);
    if (!m) continue;
    let v = m[2];
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

let fileEnv = {};
if (existsSync(envPath)) {
  fileEnv = parseEnv(readFileSync(envPath, "utf8"));
} else {
  console.log(`NOTE: ${envArg} not found — checking process.env only.`);
}

// Real environment variables win over the .env file.
const get = (name) => process.env[name] ?? fileEnv[name] ?? "";
const filled = (name) => {
  const v = get(name);
  return !!v && !PLACEHOLDER.test(v);
};
const mask = (v) => (v ? `<set: ${String(v).length} chars>` : "<empty>");

function isPem(value, ...kinds) {
  const s = String(value).replace(/\\n/g, "\n");
  return kinds.some(
    (k) =>
      s.includes(`-----BEGIN ${k}-----`) && s.includes(`-----END ${k}-----`),
  );
}

const rows = [];
const add = (level, group, label, detail = "") =>
  rows.push({ level, group, label, detail });
const ok = (g, l, d) => add("ok", g, l, d);
const warn = (g, l, d) => add("warn", g, l, d);
const fail = (g, l, d) => add("fail", g, l, d);

// ── 1. Protocol ────────────────────────────────────────────────────────────
const provider = get("PAYMENT_PROVIDER") || "waffo";
if (provider.toLowerCase() !== "waffo") {
  fail("协议", "PAYMENT_PROVIDER", `${provider} — 本检查只针对 Waffo Pancake`);
} else {
  ok("协议", "PAYMENT_PROVIDER", "waffo");
}

const flavor = get("WAFFO_FLAVOR") || "pancake";
if (flavor.toLowerCase() !== "pancake") {
  fail(
    "协议",
    "WAFFO_FLAVOR",
    `${flavor} — Acquiring 的下单 payload 依赖商户合同，见 docs/waffo.md 第 5 节`,
  );
} else {
  ok("协议", "WAFFO_FLAVOR", "pancake (docs.waffo.ai)");
}

const environment = get("WAFFO_ENVIRONMENT") || "test";
if (!["test", "prod"].includes(environment.toLowerCase())) {
  fail("协议", "WAFFO_ENVIRONMENT", `只允许 test | prod，当前 ${environment}`);
} else {
  ok("协议", "WAFFO_ENVIRONMENT", environment);
}

// ── 2. Authentication (the two modes are officially mutually exclusive) ────
const slug = get("WAFFO_STORE_SLUG");
const merchantId = get("WAFFO_MERCHANT_ID");
const privateKey = get("WAFFO_PRIVATE_KEY");
const hasSlug = !!slug && !PLACEHOLDER.test(slug);
const hasSigned =
  !!merchantId &&
  !PLACEHOLDER.test(merchantId) &&
  !!privateKey &&
  !PLACEHOLDER.test(privateKey);

if (hasSlug && hasSigned) {
  fail(
    "鉴权",
    "Store-Slug / API-Key",
    "两套鉴权同时配置了；官方明确互斥，请删掉其中一套",
  );
} else if (!hasSlug && !hasSigned) {
  fail(
    "鉴权",
    "Store-Slug / API-Key",
    "需要 WAFFO_STORE_SLUG，或 WAFFO_MERCHANT_ID + WAFFO_PRIVATE_KEY",
  );
} else if (hasSlug) {
  ok("鉴权", "WAFFO_STORE_SLUG", mask(slug));
} else if (!isPem(privateKey, "PRIVATE KEY", "RSA PRIVATE KEY")) {
  fail("鉴权", "WAFFO_PRIVATE_KEY", "不是合法 PEM（需 BEGIN/END PRIVATE KEY；单行用 \\n 转义）");
} else {
  ok("鉴权", "RSA API-Key", `merchant=${mask(merchantId)}, key=${mask(privateKey)}`);
}

// ── 3. Endpoints ───────────────────────────────────────────────────────────
const apiBase = get("WAFFO_API_BASE");
if (apiBase && apiBase.replace(/\/+$/, "") !== "https://api.waffo.ai") {
  fail("端点", "WAFFO_API_BASE", `${apiBase} — Pancake 是 https://api.waffo.ai`);
} else {
  ok("端点", "WAFFO_API_BASE", apiBase || "default: https://api.waffo.ai");
}
const checkoutPath = get("WAFFO_CHECKOUT_PATH");
if (checkoutPath && checkoutPath !== "/v1/actions/checkout/create-session") {
  fail("端点", "WAFFO_CHECKOUT_PATH", `${checkoutPath} — 疑似旧版假想端点`);
} else {
  ok("端点", "WAFFO_CHECKOUT_PATH", checkoutPath || "default: /v1/actions/checkout/create-session");
}
ok("端点", "Webhook", "POST <site>/api/webhook（所有支付商共用，需在 test + prod 后台注册）");

// ── 4. Products ────────────────────────────────────────────────────────────
for (const [name, label] of [
  ["WAFFO_PRICE_ID_BUYOUT", "一次性 Buyout 产品"],
  ["WAFFO_PRICE_ID_CARE", "月订阅 Care 产品"],
]) {
  if (!filled(name)) fail("产品", name, `未填或仍是占位符（${label}）`);
  else ok("产品", name, mask(get(name)));
}
if (
  filled("WAFFO_PRICE_ID_BUYOUT") &&
  filled("WAFFO_PRICE_ID_CARE") &&
  get("WAFFO_PRICE_ID_BUYOUT") === get("WAFFO_PRICE_ID_CARE")
) {
  fail("产品", "产品 ID 重复", "Buyout 与 Care 不能指向同一个产品（会被按错误周期扣款）");
}

// ── 5. Webhook public keys ─────────────────────────────────────────────────
for (const name of [
  "WAFFO_WEBHOOK_PUBLIC_KEY_TEST",
  "WAFFO_WEBHOOK_PUBLIC_KEY_PROD",
]) {
  const v = get(name);
  if (!filled(name)) {
    fail("验签公钥", name, "未填或仍是占位符；test/prod 两套都必须配置");
  } else if (!isPem(v, "PUBLIC KEY")) {
    fail("验签公钥", name, "不是 BEGIN PUBLIC KEY 的 PEM；单行用 \\n 转义");
  } else {
    ok("验签公钥", name, mask(v));
  }
}

// ── 6. License gate ────────────────────────────────────────────────────────
const secret = get("LICENSE_SECRET");
if (!filled("LICENSE_SECRET")) {
  fail("授权", "LICENSE_SECRET", "未配置；生产将无法签发 license，付费用户也拿不到源码 ZIP（门禁本身 fail-safe，生产恒开）");
} else if (secret.length < 32) {
  fail("授权", "LICENSE_SECRET", "长度不足 32；用 openssl rand -hex 32");
} else {
  ok("授权", "LICENSE_SECRET", mask(secret));
}
const gate = (get("LICENSE_GATE") || "auto").toLowerCase();
if (!["on", "off", "auto"].includes(gate)) {
  fail("授权", "LICENSE_GATE", `只允许 on | off | auto，当前 ${gate}`);
} else if (gate === "off") {
  warn("授权", "LICENSE_GATE", "off — 本站下载门槛被关闭（客户模板里这是正确值，本站生产不是）");
} else if (gate === "auto") {
  ok("授权", "LICENSE_GATE", "auto — 生产环境恒开门禁（fail-safe），开发环境关闭");
} else {
  ok("授权", "LICENSE_GATE", gate);
}
const freeRaw = get("FREE_GENERATIONS_PER_DAY") || "1";
if (!/^\d+$/.test(freeRaw)) {
  fail("授权", "FREE_GENERATIONS_PER_DAY", `必须是非负整数，当前 ${freeRaw}`);
} else {
  ok("授权", "FREE_GENERATIONS_PER_DAY", `${freeRaw} 次 / 访客 / 天（仅无源码预览包）`);
}

// ── 7. Site / persistence / admin ──────────────────────────────────────────
const site = get("NEXT_PUBLIC_SITE_URL");
if (!filled("NEXT_PUBLIC_SITE_URL")) {
  fail("站点", "NEXT_PUBLIC_SITE_URL", "未填或仍是占位符；结账 successUrl 会指向错误域名");
} else if (!/^https?:\/\//i.test(site)) {
  fail("站点", "NEXT_PUBLIC_SITE_URL", "必须包含 http(s):// 前缀");
} else if (site.includes("localhost") || site.startsWith("http://")) {
  const msg = `${site} — 生产应为正式 https 域名`;
  if (strict) fail("站点", "NEXT_PUBLIC_SITE_URL", msg);
  else warn("站点", "NEXT_PUBLIC_SITE_URL", msg);
} else {
  ok("站点", "NEXT_PUBLIC_SITE_URL", site);
}

for (const name of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
]) {
  if (!filled(name)) fail("持久化", name, "未填或仍是占位符；0003_licenses.sql 也需要 Supabase");
  else ok("持久化", name, mask(get(name)));
}
// Informational only: a static script cannot inspect a remote database.
// Keeping it as PASS (not WARN) means --strict stays usable for go-live.
ok("持久化", "0003_licenses.sql", "需人工确认已执行（脚本无法验证 licenses / webhook_events 表）");

for (const name of ["ADMIN_USER", "ADMIN_PASSWORD"]) {
  if (!filled(name)) warn("管理后台", name, "未设置时 /admin 与 /admin/licenses 是公开的");
  else ok("管理后台", name, mask(get(name)));
}

// ── 8. Deprecated variables ────────────────────────────────────────────────
for (const name of [
  "WAFFO_WEBHOOK_SECRET",
  "WAFFO_API_KEY",
  "WAFFO_WEBHOOK_PUBLIC_KEY",
]) {
  if (get(name)) {
    warn("废弃变量", name, "Pancake 不读取该变量；建议删除以免误导（见 docs/waffo.md 第 7 节）");
  }
}

// ── Report ─────────────────────────────────────────────────────────────────
const groups = [...new Set(rows.map((r) => r.group))];
for (const g of groups) {
  console.log(`\n[${g}]`);
  for (const r of rows.filter((x) => x.group === g)) {
    const tag = r.level === "ok" ? "PASS" : r.level === "warn" ? "WARN" : "FAIL";
    console.log(`  ${tag.padEnd(4)} ${r.label}${r.detail ? ` — ${r.detail}` : ""}`);
  }
}

const fails = rows.filter((r) => r.level === "fail").length;
const warns = rows.filter((r) => r.level === "warn").length;
const ready = fails === 0 && (!strict || warns === 0);
console.log(
  `\nenv=${envArg}  strict=${strict}  FAIL=${fails}  WARN=${warns}  ready=${ready}`,
);
if (!ready) {
  console.log("按 docs/waffo-launch-checklist.md 第 1 节逐项替换后重跑本脚本。");
  process.exit(1);
}
console.log("静态检查通过。下一步：部署后跑 /api/payments/self-check 并做一笔真实 test 付款。");
