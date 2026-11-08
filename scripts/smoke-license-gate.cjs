/**
 * End-to-end smoke test for the source-ZIP license gate and the P0 stripping.
 *
 * Self-contained: it starts its own `next start` with a throwaway SQLite DB,
 * so it is repeatable on the same day and never touches .data/shipkit.db.
 *
 *   node scripts/smoke-license-gate.cjs
 *   SMOKE_BASE_URL=http://127.0.0.1:3002 node scripts/smoke-license-gate.cjs
 *     ^ reuse an already-running LICENSE_GATE=on server instead of spawning one
 *
 * Checks:
 *   1. anonymous POST /api/generate -> 402 license_required + preview offer
 *   2. anonymous POST /api/generate/preview -> 200 ZIP with NO application source
 *   3. the signed visitor AND trusted-network quota both hold (spoofed XFF,
 *      and a cleared cookie, must not mint another preview)
 *   4. a valid offline SK1 license key unlocks the full source ZIP
 *   5. that ZIP has brand-free home/pricing, no generator factory, no
 *      make1day marketing pages and no dead links
 *   6. RAG ingest/query refuse anonymous callers, demo session still works
 */
const path = require("node:path");
const http = require("node:http");
const fs = require("node:fs");
const { spawn, execFileSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const APP_PORT = 3004;
const EXTERNAL_BASE = (process.env.SMOKE_BASE_URL ?? "").replace(/\/+$/, "");
const BASE = EXTERNAL_BASE || `http://127.0.0.1:${APP_PORT}`;

const CONFIG = {
  appName: "Gate Smoke App",
  auth: ["email"],
  payment: "waffo",
  ai: ["openai"],
  features: ["landing", "dashboard", "account", "admin"],
  deploy: "vercel",
  style: "midnight",
  skills: ["frontend"],
};

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

/** Cookie jar so the signed sk_trial token survives between requests. */
let jar = "";
function remember(res) {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const line of raw) {
    const [pair] = line.split(";");
    const name = pair.split("=")[0].trim();
    jar = jar
      .split(";")
      .map((x) => x.trim())
      .filter((x) => x && !x.startsWith(name + "="))
      .concat(pair.trim())
      .join("; ");
  }
}

async function post(route, body, { extraHeaders = {}, useJar = true } = {}) {
  const headers = { "Content-Type": "application/json", ...extraHeaders };
  if (useJar && jar) headers.Cookie = jar;
  const res = await fetch(BASE + route, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  remember(res);
  return res;
}

async function zipOf(res) {
  const JSZip = (await import("jszip")).default;
  return JSZip.loadAsync(Buffer.from(await res.arrayBuffer()));
}

function waitFor(url, tries = 60) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      http
        .get(url, (res) => {
          res.resume();
          if (res.statusCode && res.statusCode < 500) resolve();
          else if (n <= 0) reject(new Error("timeout waiting for " + url));
          else setTimeout(() => attempt(n - 1), 500);
        })
        .on("error", () => {
          if (n <= 0) reject(new Error("timeout waiting for " + url));
          else setTimeout(() => attempt(n - 1), 500);
        });
    };
    attempt(tries);
  });
}

function startApp() {
  const dbPath = path.join(ROOT, ".data", "smoke-license-gate.db");
  try {
    fs.unlinkSync(dbPath);
  } catch {
    /* no previous run */
  }
  const env = {
    ...process.env,
    LICENSE_GATE: "on",
    // Exercise the demo (one-cookie) session path too. Production keeps this
    // closed unless BOTH flags are set, so the smoke server opts in explicitly.
    NEXT_PUBLIC_ENABLE_DEMO: "true",
    DEMO_IN_PRODUCTION: "true",
    FREE_GENERATIONS_PER_DAY: "1",
    FREE_GENERATIONS_PER_DAY_PER_IP: "1",
    SQLITE_PATH: dbPath,
  };
  delete env.NEXT_PUBLIC_SUPABASE_URL;
  delete env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete env.SUPABASE_SERVICE_ROLE_KEY;
  const nextBin = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
  const app = spawn(process.execPath, [nextBin, "start", "-p", String(APP_PORT)], {
    cwd: ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  app.stdout.on("data", (d) => (log += d.toString()));
  app.stderr.on("data", (d) => (log += d.toString()));
  return { app, log: () => log };
}

async function main() {
  let server = null;
  if (!EXTERNAL_BASE) {
    server = startApp();
    try {
      await waitFor(BASE + "/api/health");
    } catch (err) {
      console.error("app did not start:\n" + server.log());
      server.app.kill();
      process.exit(1);
    }
    console.log(`started ${BASE} with a throwaway SQLite DB`);
  } else {
    console.log(`using running server ${BASE}`);
  }

  try {
    await runChecks();
  } finally {
    if (server) server.app.kill();
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} smoke checks passed`);
  process.exit(failed ? 1 : 0);
}

async function runChecks() {
  // A fresh, valid offline key for a fictional buyer.
  const key = execFileSync(
    process.execPath,
    [
      path.join(ROOT, "scripts", "issue-license.mjs"),
      "--email",
      "gate-smoke@example.com",
      "--plan",
      "buyout",
      "--order",
      "SMOKE-GATE",
    ],
    { cwd: ROOT, encoding: "utf8" },
  )
    .split(/\r?\n/)[0]
    .trim();

  check("issued a valid SK1 offline key", key.startsWith("SK1."), key.slice(0, 12) + "...");

  // ── 1. anonymous full ZIP is refused ──────────────────────────────────
  const denied = await post("/api/generate", CONFIG);
  const deniedBody = await denied.json();
  check("anonymous /api/generate is 402", denied.status === 402, `status=${denied.status}`);
  check(
    "402 offers the source-free preview instead of the product",
    deniedBody.error === "license_required" && deniedBody.previewAvailable === true,
    JSON.stringify(deniedBody),
  );

  // ── 2. anonymous preview contains NO application source ───────────────
  const preview = await post("/api/generate/preview", CONFIG);
  check("anonymous /api/generate/preview is 200", preview.status === 200, `status=${preview.status}`);
  if (preview.status === 200) {
    const z = await zipOf(preview);
    const names = Object.keys(z.files).filter((n) => !z.files[n].dir);
    check(
      "preview ZIP carries the inventory + design tokens",
      names.includes("PREVIEW.md") &&
        names.includes("inventory.json") &&
        names.some((n) => n.startsWith("theme/")),
      names.join(", ").slice(0, 180),
    );
    check(
      "preview ZIP contains NO application source",
      !names.some((n) => /\.(tsx?|jsx?|sql|mdc)$/.test(n) || n.startsWith("app/")),
      names.join(", ").slice(0, 180),
    );
  }

  // ── 3. neither a spoofed XFF nor a cleared cookie mints another preview ─
  const spoof = await post("/api/generate/preview", CONFIG, {
    extraHeaders: { "x-forwarded-for": "8.8.8.8" },
  });
  const spoofBody = await spoof.json().catch(() => ({}));
  check(
    "a spoofed XFF does not mint another preview (402 preview_limit_reached)",
    spoof.status === 402 && spoofBody.error === "preview_limit_reached",
    `status=${spoof.status} body=${JSON.stringify(spoofBody)}`,
  );

  const cleared = await post("/api/generate/preview", CONFIG, { useJar: false });
  check(
    "clearing cookies does not mint another preview (network bucket)",
    cleared.status === 402,
    `status=${cleared.status}`,
  );

  // ── 4. a paid key unlocks the real source ZIP ──────────────────────────
  const paid = await post("/api/generate", { ...CONFIG, licenseKey: key });
  check(
    "valid license key returns the full ZIP (200)",
    paid.status === 200 && (paid.headers.get("content-type") ?? "").includes("zip"),
    `status=${paid.status} type=${paid.headers.get("content-type")}`,
  );
  check(
    "response names the entitlement reason",
    (paid.headers.get("x-shipkit-entitlement") ?? "").length > 0,
    `header=${paid.headers.get("x-shipkit-entitlement")}`,
  );

  if (paid.status === 200) {
    const z = await zipOf(paid);
    const names = Object.keys(z.files).filter((n) => !z.files[n].dir);
    const has = (n) => names.includes(n);

    check(
      "customer ZIP is a real Next.js app",
      has("app/page.tsx") && has("app/layout.tsx") && has("package.json"),
      `files=${names.length}`,
    );
    check(
      "customer ZIP does NOT contain the generator factory",
      !names.some(
        (n) =>
          n.startsWith("lib/generator/") ||
          n.startsWith("app/builder") ||
          n.startsWith("app/api/generate") ||
          n === "components/Builder.tsx",
      ),
      "",
    );
    check(
      "customer ZIP drops make1day marketing pages",
      !names.some((n) =>
        ["app/blog/", "app/compare/", "app/faq/", "app/license/"].some((p) =>
          n.startsWith(p),
        ),
      ),
      "",
    );
    check(
      "customer ZIP ships the rebrand helper referenced by README",
      has("scripts/rebrand.mjs") && has("LICENSE"),
      "",
    );

    const home = await z.file("app/page.tsx").async("string");
    const pricing = await z.file("app/pricing/page.tsx").async("string");
    const sitemap = await z.file("app/sitemap.ts").async("string");
    const env = await z.file("lib/env.ts").async("string");
    const forbidden = ["make1day", "make1day", "Makerkit", "Supastarter", "ShipFast"];
    check(
      "generated home + pricing are brand-free",
      ![home, pricing].some((s) => forbidden.some((w) => s.includes(w))),
      "",
    );
    check(
      "generated sitemap has no dead links",
      !["/builder", "/agent-ready", "/styles", "/blog", "/compare", "/faq", "/license"].some(
        (p) => sitemap.includes(`"${p}"`) || sitemap.includes(`'${p}'`),
      ),
      "",
    );
    check(
      "customer project has the license gate OFF by default",
      /LICENSE_GATE[^;]*"off"/.test(env) || env.includes('"off"'),
      "",
    );
  }

  // ── 5. RAG refuses anonymous callers ──────────────────────────────────
  const ingest = await fetch(BASE + "/api/rag/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "smoke", text: "anonymous poison" }),
  });
  check("anonymous RAG ingest is 401", ingest.status === 401, `status=${ingest.status}`);

  const query = await fetch(BASE + "/api/rag/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "what is this?" }),
  });
  check("anonymous RAG query is 401", query.status === 401, `status=${query.status}`);

  const demoQuery = await fetch(BASE + "/api/rag/query", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: "sk_demo=1" },
    body: JSON.stringify({ question: "what is this?" }),
  });
  check(
    "demo session can still use the RAG query",
    demoQuery.status === 200,
    `status=${demoQuery.status}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
