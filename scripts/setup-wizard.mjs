#!/usr/bin/env node
// setup-wizard - a SHORT key-entry page for this project.
//
//   node scripts/setup-wizard.mjs            starts on http://127.0.0.1:7777
//   node scripts/setup-wizard.mjs --port N   different port
//   node scripts/setup-wizard.mjs --no-open  don't launch a browser
//
// Design rules:
// - The CLIs do what CLIs can do (supabase login/link, vercel link, gh auth,
//   wrangler login). We show the command, we never ask for a value the CLI
//   can derive.
// - The wizard only asks for values that come from a provider CONSOLE
//   (secret keys, anon key, price ids) - and only for the providers THIS
//   build selected (read from app-template.config.json when present).
// - Every other variable from .env.example stays reachable under a collapsed
//   "Advanced" section, so nothing becomes unconfigurable.
// - POST writes only non-empty fields into .env.local (0600). The server
//   binds 127.0.0.1 only; nothing leaves the machine.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { exec } from "node:child_process";

const root = process.cwd();
const args = process.argv.slice(2);
const portIdx = args.indexOf("--port");
const port = Number(portIdx >= 0 ? args[portIdx + 1] || "7777" : "7777");
const noOpen = args.includes("--no-open");

const ENV_EXAMPLE = path.join(root, ".env.example");
const ENV_LOCAL = path.join(root, ".env.local");
const CONFIG_JSON = path.join(root, "app-template.config.json");

// ── what the build actually selected (re-read every render) ──────────────
function readConfigNow() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_JSON, "utf8"));
  } catch {
    return null; // site repo / old layout: fall back to showing all groups
  }
}

// ── curated provider guide ─────────────────────────────────────────────────
// vars: the console-issued keys worth typing; rest of a prefix lives in Advanced.
const GUIDES = [
  {
    id: "supabase",
    // shown when the build wires Supabase at all: database skill or real OAuth
    match: (cfg) => !cfg || (cfg.skills || []).includes("database") || (cfg.auth || []).some((a) => a !== "email"),
    title: "Database & auth - Supabase",
    cli: ["npx supabase login", "npx supabase link --project-ref <ref>"],
    console: { label: "Open the Supabase dashboard", url: "https://supabase.com/dashboard" },
    where: "Project settings → API. Copy the project ref from the dashboard URL.",
    vars: [
      { name: "NEXT_PUBLIC_SUPABASE_URL", label: "Project URL", howto: "Settings → API → Project URL" },
      { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", label: "Anon public key", howto: "Settings → API → anon public (safe for the browser)", secret: false },
      { name: "SUPABASE_SERVICE_ROLE_KEY", label: "Service role key", howto: "Settings → API → service_role - SERVER ONLY, never expose", secret: true },
    ],
  },
  {
    id: "waffo",
    match: (cfg) => cfg?.payment?.includes("waffo") ?? true,
    title: "Payments - Waffo",
    cli: [],
    console: { label: "Waffo dashboard", url: "https://pancake.waffo.ai" },
    where: "Create products (one-time + subscription) and copy their PROD_… ids. Private key: developer → API keys.",
    vars: [
      { name: "WAFFO_ENVIRONMENT", label: "Environment", howto: "test | prod", example: "test" },
      { name: "WAFFO_PRICE_ID_BUYOUT", label: "Buyout product id", howto: "PROD_…", example: "PROD_…" },
      { name: "WAFFO_PRICE_ID_CARE", label: "Care subscription id", howto: "PROD_…", example: "PROD_…" },
      { name: "WAFFO_PRIVATE_KEY", label: "Merchant private key", howto: "signs checkout requests - paste with care", secret: true },
      { name: "WAFFO_WEBHOOK_PUBLIC_KEY_PROD", label: "Webhook public key (prod)", howto: "settings → webhooks → platform key", secret: true },
    ],
  },
  {
    id: "stripe",
    match: (cfg) => cfg?.payment?.includes("stripe") ?? true,
    title: "Payments - Stripe",
    cli: [],
    console: { label: "Stripe dashboard", url: "https://dashboard.stripe.com/apikeys" },
    where: "Developers → API keys (restricted key recommended); webhook endpoint -> your /api/webhook.",
    vars: [
      { name: "STRIPE_SECRET_KEY", label: "Secret / restricted key", howto: "sk_… (prefer a restricted key)", secret: true },
      { name: "STRIPE_WEBHOOK_SECRET", label: "Webhook signing secret", howto: "whsec_… from the endpoint", secret: true },
      { name: "STRIPE_PRICE_ID_BUYOUT", label: "Buyout price id", howto: "Products → price", example: "price_…" },
      { name: "STRIPE_PRICE_ID_CARE", label: "Care recurring price id", howto: "must be a real recurring Price", example: "price_…" },
    ],
  },
  {
    id: "creem",
    match: (cfg) => cfg?.payment?.includes("creem") ?? true,
    title: "Payments - Creem",
    cli: [],
    console: { label: "Creem dashboard", url: "https://creem.io/dashboard" },
    where: "Products + API keys + webhook secret.",
    vars: [
      { name: "CREEM_API_KEY", label: "API key", secret: true },
      { name: "CREEM_WEBHOOK_SECRET", label: "Webhook secret", secret: true },
      { name: "CREEM_PRICE_ID_BUYOUT", label: "Buyout product id", example: "prod_…" },
      { name: "CREEM_PRICE_ID_CARE", label: "Care product id", example: "prod_…" },
    ],
  },
  {
    id: "paypal",
    match: (cfg) => cfg?.payment?.includes("paypal") ?? true,
    title: "Payments - PayPal",
    cli: [],
    console: { label: "PayPal developer dashboard", url: "https://developer.paypal.com/dashboard/applications/live" },
    where: "Apps & Credentials → REST app (Live). Subscriptions need the plan ids from your billing plan.",
    vars: [
      { name: "PAYPAL_CLIENT_ID", label: "Client id" },
      { name: "PAYPAL_CLIENT_SECRET", label: "Client secret", secret: true },
      { name: "PAYPAL_PLAN_ID_BUYOUT", label: "One-time price id", example: "P-…" },
      { name: "PAYPAL_PLAN_ID_CARE", label: "Recurring plan id", example: "P-…" },
    ],
  },
  {
    id: "lemonsqueezy",
    match: (cfg) => cfg?.payment?.includes("lemonsqueezy") ?? true,
    title: "Payments - Lemon Squeezy",
    cli: [],
    console: { label: "Lemon Squeezy store", url: "https://app.lemonsqueezy.com" },
    where: "Products → variants (variant ids); developer tab for API + webhook secret.",
    vars: [
      { name: "LEMONSQUEEZY_API_KEY", label: "API key", secret: true },
      { name: "LEMONSQUEEZY_WEBHOOK_SECRET", label: "Webhook secret", secret: true },
      { name: "LEMONSQUEEZY_VARIANT_ID_BUYOUT", label: "Buyout variant id" },
      { name: "LEMONSQUEEZY_VARIANT_ID_CARE", label: "Care variant id" },
    ],
  },
  {
    id: "ai",
    match: (cfg) => true,
    title: "AI provider keys",
    cli: [],
    console: { label: "OpenAI platform", url: "https://platform.openai.com/api-keys" },
    where: "Only paste the providers you selected in the builder; others stay blank.",
    vars: [
      { name: "OPENAI_API_KEY", label: "OpenAI", howto: "platform.openai.com/api-keys", secret: true },
      { name: "ANTHROPIC_API_KEY", label: "Anthropic", howto: "console.anthropic.com", secret: true },
      { name: "GEMINI_API_KEY", label: "Google Gemini", howto: "aistudio.google.com", secret: true },
      { name: "GROQ_API_KEY", label: "Groq", secret: true },
      { name: "DEEPSEEK_API_KEY", label: "DeepSeek", secret: true },
      { name: "OPENROUTER_API_KEY", label: "OpenRouter", secret: true },
      { name: "FAL_KEY", label: "fal.ai (image/video lanes)", secret: true },
    ].filter((v) => true),
  },
  {
    id: "mail",
    match: () => true,
    title: "Transactional email",
    cli: [],
    console: { label: "Resend", url: "https://resend.com/api-keys" },
    where: "recommends a dedicated sending subdomain + SPF/DKIM. Provider=none logs only (degraded).",
    vars: [
      { name: "MAIL_PROVIDER", label: "resend | webhook | none", example: "resend" },
      { name: "RESEND_API_KEY", label: "Resend API key", secret: true },
      { name: "MAIL_FROM", label: "From address", example: "app@yourdomain.dev" },
    ],
  },
  {
    id: "admin",
    match: () => true,
    title: "Admin console access",
    cli: [],
    console: null,
    where: "Without these the /admin stays CLOSED (fails safe). Pick a real password.",
    vars: [
      { name: "ADMIN_USER", label: "Admin login" },
      { name: "ADMIN_PASSWORD", label: "Admin password", secret: true },
    ],
  },
];

// ── .env.example parsing (for the Advanced section + existence checks) ─────
function parseExample() {
  if (!fs.existsSync(ENV_EXAMPLE)) return [];
  const names = [];
  for (const raw of fs.readFileSync(ENV_EXAMPLE, "utf8").replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const m = /^#?\s*([A-Z][A-Z0-9_]*)=/.exec(line);
    if (m && !names.includes(m[1])) names.push(m[1]);
  }
  return names;
}

const guideVarNames = new Set(GUIDES.flatMap((g) => g.vars.map((v) => v.name)));
const exampleVars = parseExample();
const advancedVars = exampleVars.filter((n) => !guideVarNames.has(n) && !/^(WAFFO|STRIPE|CREEM|PAYPAL|LEMONSQUEEZY)_(PRIVATE_KEY_)/.test(n));

function existingEnv() {
  if (!fs.existsSync(ENV_LOCAL)) return new Map();
  const out = new Map();
  for (const l of fs.readFileSync(ENV_LOCAL, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z][A-Z0-9_]*)=(.*)$/.exec(l);
    if (m) out.set(m[1], m[2]);
  }
  return out;
}

// AI card: only show the providers this build selected (or all when unknown)
function guideVars(g, config) {
  if (g.id === "ai" && config?.ai?.length) {
    const keep = new Set(config.ai.map((p) => `${String(p).toUpperCase()}_API_KEY`));
    if (config.skills?.includes("video")) keep.add("FAL_KEY");
    return g.vars.filter((v) => keep.has(v.name));
  }
  return g.vars;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function renderCards() {
  const config = readConfigNow();
  const have = existingEnv();
  const cards = [];
  for (const g of GUIDES) {
    if (!g.match(config)) continue;
    const vars = guideVars(g, config);
    if (!vars.length) continue;
    const done = vars.filter((v) => (have.get(v.name) || "").trim().length > 0).length;
    const steps = [];
    if (g.cli.length) {
      steps.push(`<ol class="steps"><li>Run in a terminal:${g.cli.map((c) => `<div class="cmd"><code>${esc(c)}</code><button type="button" class="cp" data-cmd="${esc(c)}">copy</button></div>`).join("")}</li>` +
        `<li>Then the dashboard values below (the CLI gives you the project ref; the anon key: <code>npx supabase projects api-keys --project-ref &lt;ref&gt;</code>).</li></ol>`);
    } else if (g.where) {
      steps.push(`<p class="where">${esc(g.where)}</p>`);
    }
    const fields = vars.map((v) => {
      const filled = (have.get(v.name) || "").trim();
      return `<label class="field${filled ? " filled" : ""}">
  <span class="k">${esc(v.label || v.name)}${filled ? ' <em class="ok">set</em>' : ""}</span>
  <span class="kname">${esc(v.name)}</span>
  <input name="${esc(v.name)}" type="${v.secret === false ? "text" : "password"}" placeholder="${esc(filled ? "•••• leave blank to keep" : v.example || "paste value")}" autocomplete="off" spellcheck="false">
  ${v.howto ? `<span class="h">${esc(v.howto)}</span>` : ""}
</label>`;
    }).join("\n");
    cards.push(`<section class="card" id="${g.id}">
  <header><h2>${esc(g.title)}</h2><span class="badge" data-total="${vars.length}" data-done="${done}">${done}/${vars.length}</span></header>
  ${g.console ? `<a class="dash" href="${esc(g.console.url)}" target="_blank" rel="noopener">${esc(g.console.label)} ↗</a>` : ""}
  ${steps.join("\n")}
  ${fields}
</section>`);
  }
  return cards.join("\n");
}

function render() {
  const have = existingEnv();
  const adv = advancedVars
    .filter((n) => !/^(NEXT_PUBLIC_SUPABASE|SUPABASE_SERVICE)/.test(n) || true)
    .map((n) => {
      const filled = (have.get(n) || "").trim();
      const secret = /KEY|SECRET|TOKEN|PASSWORD|PRIVATE/i.test(n);
      return `<label class="field afield${filled ? " filled" : ""}"><span class="kname">${esc(n)}${filled ? ' <em class="ok">set</em>' : ""}</span><input name="${esc(n)}" type="${secret ? "password" : "text"}" placeholder="${filled ? "•••• keep" : "value"}" autocomplete="off" spellcheck="false"></label>`;
    })
    .join("\n");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Setup wizard - paste what the CLI can't</title>
<style>
 body{font:15px/1.5 -apple-system,"Segoe UI",Roboto,Arial,sans-serif;background:#0a0c0f;color:#e8eaed;margin:0;padding:28px 16px 64px}
 main{max-width:1080px;margin:0 auto}
 h1{font-size:21px;margin:0 0 4px}
 .sub{color:#9aa3ad;font-size:13px;margin:0 0 10px}
 .bar{height:6px;border-radius:99px;background:#1c2128;margin:0 0 22px;overflow:hidden}
 .bar i{display:block;height:100%;background:#5eead4;width:0}
 .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(430px,1fr));gap:14px}
 @media(max-width:940px){.grid{grid-template-columns:1fr}}
 .card{border:1px solid #232830;border-radius:14px;background:#12161b;padding:16px 18px}
 .card h2{font-size:14px;margin:0;text-transform:uppercase;letter-spacing:.04em;color:#5eead4}
 .card header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
 .badge{font-family:ui-monospace,Menlo,monospace;font-size:12px;border:1px solid #232830;border-radius:99px;padding:2px 10px;color:#9aa3ad}
 .badge.complete{color:#07211c;background:#5eead4;border-color:#5eead4}
 .dash{display:inline-block;font-size:12.5px;color:#7cc7f5;text-decoration:none;margin:0 0 8px}
 .dash:hover{text-decoration:underline}
 .where{font-size:12.5px;color:#9aa3ad;margin:2px 0 10px}
 .steps{margin:2px 0 10px;padding-left:18px;font-size:12.5px;color:#9aa3ad}
 .cmd{display:flex;align-items:center;gap:8px;margin:3px 0}
 .cmd code{flex:1;background:#0a0c0f;border:1px solid #232830;border-radius:6px;padding:4px 8px;font-size:12px;color:#c9e5db}
 .cp{background:transparent;border:1px solid #232830;border-radius:6px;color:#9aa3ad;font-size:11px;padding:3px 7px;cursor:pointer}
 .cp:hover{color:#5eead4;border-color:#5eead4}
 .field{display:block;margin:0 0 10px;padding:8px 10px;border:1px solid #1d2229;border-radius:10px}
 .field.filled{border-color:#1f3b33;background:#0f1816}
 .k{display:block;font-size:12.5px;font-weight:600;color:#e8eaed}
 .k .ok{color:#5eead4;font-style:normal;font-size:10.5px;margin-left:6px}
 .kname{display:block;font-family:ui-monospace,Menlo,monospace;font-size:10.5px;color:#6c7681;margin:1px 0 4px}
 .h{display:block;font-size:11.5px;color:#9aa3ad;margin-top:4px}
 input{width:100%;box-sizing:border-box;background:#0a0c0f;border:1px solid #232830;border-radius:8px;color:#e8eaed;padding:7px 9px;font-family:ui-monospace,Menlo,monospace;font-size:12.5px}
 input:focus{outline:none;border-color:#5eead4}
 .actions{position:sticky;bottom:0;margin-top:18px;padding:12px 0;background:linear-gradient(transparent,#0a0c0f 40%);display:flex;gap:12px;align-items:center}
 button.save{background:#5eead4;color:#07211c;font-weight:700;border:0;border-radius:10px;padding:10px 20px;font-size:14px;cursor:pointer}
 .done{font-size:13px;color:#5eead4}
 details{margin-top:22px;border:1px dashed #232830;border-radius:12px;padding:10px 14px}
 summary{cursor:pointer;font-size:13px;color:#9aa3ad}
 .afield{margin:8px 0;padding:6px 8px}
 .privacy{color:#6c7681;font-size:11.5px;margin-top:16px}
</style></head><body><main>
 <h1>Setup wizard - the few keys the CLI can't fetch</h1>
 <p class="sub">Login / project link are <b>terminal jobs</b>: run the copyable commands. This page only asks for console-issued secrets. Served on 127.0.0.1; writes <code>.env.local</code> (0600); blank field = keep existing value.</p>
 <div class="bar"><i id="prog"></i></div>
 <form id="f"><div class="grid">${renderCards()}</div>
 <div class="actions"><button type="button" class="save" onclick="save()">Save to .env.local</button><span class="done" id="done"></span></div></form>
 <details><summary>Advanced - the other ${advancedVars.length} variables from <code>.env.example</code> (usually none of these)</summary>${adv}</details>
 <p class="privacy">After saving: <code>npm run dev</code>. Payment gateways: register webhook endpoint <b>/api/webhook</b> in the provider dashboard (one URL for all gateways). Then run <code>npm run compliance:check</code> before deploying.</p>
</main>
<script>
function refresh(){
  let t=0,d=0;
  document.querySelectorAll(".badge").forEach(b=>{t+=+b.dataset.total;d+=+b.dataset.done;const v=(+b.dataset.done)/(+b.dataset.total||1);b.classList.toggle("complete",v>=1)});
  document.getElementById("prog").style.width=(100*d/Math.max(t,1))+"%";
}
document.addEventListener("click",e=>{
  if(e.target.classList.contains("cp")){navigator.clipboard.writeText(e.target.dataset.cmd);e.target.textContent="copied";setTimeout(()=>e.target.textContent="copy",1200);}
});
async function save(){
  const data={};
  new FormData(document.getElementById("f")).forEach((v,k)=>{if(String(v).trim())data[k]=String(v).trim();});
  const r=await fetch("/save",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
  const j=await r.json();
  document.getElementById("done").textContent=j.ok?("saved "+j.written+" key(s) to .env.local"):"failed: "+j.error;
  if(j.ok) setTimeout(()=>location.reload(),900);
}
refresh();
</script></body></html>`;
}

function mergeSave(updates) {
  const lines = fs.existsSync(ENV_LOCAL) ? fs.readFileSync(ENV_LOCAL, "utf8").replace(/\r\n/g, "\n").split("\n") : [];
  let written = 0;
  for (const [k, v] of Object.entries(updates)) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(k)) continue;
    const live = lines.findIndex((l) => l.trim().startsWith(k + "="));
    if (live >= 0) {
      lines[live] = `${k}=${v}`;
    } else {
      const commented = lines.findIndex((l) => new RegExp(`^#\\s*${k}=`).test(l.trim()));
      if (commented >= 0) lines.splice(commented + 1, 0, `${k}=${v}`);
      else lines.push(`${k}=${v}`);
    }
    written++;
  }
  fs.writeFileSync(ENV_LOCAL, lines.join("\n") + "\n", { mode: 0o600 });
  return written;
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(render());
    return;
  }
  if (req.method === "POST" && req.url === "/save") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const written = mergeSave(JSON.parse(body || "{}"));
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true, written }));
      } catch (e) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(port, "127.0.0.1", () => {
  const url = `http://127.0.0.1:${port}`;
  console.log(`setup wizard: ${url}  (Ctrl+C to stop; keys stay local)`);
  if (!noOpen) {
    const cmd = process.platform === "win32" ? "start" : process.platform === "darwin" ? "open" : "xdg-open";
    exec(`${cmd} ${url}`, () => {});
  }
});
