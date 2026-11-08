/**
 * Runtime smoke test for the AI daily quota.
 *
 * Runs a FAKE Supabase (auth + rest + the 0009 RPC) and a real `next start`
 * against the working tree, then exercises /api/ai:
 *
 *   Phase A (Supabase configured)
 *     1. AI_MESSAGES_PER_DAY=2, subscribed user -> calls 1+2 pass, call 3 = 429
 *     2. the same user again      -> still 429 (the counter persisted)
 *     3. logged in but NOT subscribed -> 402 (and no quota spent)
 *     4. the quota counter really landed in the SQLite database
 *
 *   Phase B (no Supabase -> demo mode)
 *     5. demo mode is never limited
 *
 * Usage: node scripts/smoke-ai-quota.cjs
 */
const http = require("node:http");
const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

const ROOT = path.resolve(__dirname, "..");
const FAKE_PORT = 54329;
const APP_PORT = 3100;
const DEMO_PORT = 3101;
const LIMIT = 2;

const USERS = {
  "sub-user": {
    id: "11111111-1111-4111-8111-111111111111",
    email: "subscriber@example.com",
    subscribed: true,
  },
  "nosub-user": {
    id: "22222222-2222-4222-8222-222222222222",
    email: "nosub@example.com",
    subscribed: false,
  },
};

const usage = new Map(); // user_id -> { day, used }

function dayKey() {
  return new Date().toISOString().slice(0, 10);
}

function send(res, status, body) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "*",
  });
  res.end(payload);
}

// ── The fake Supabase ──────────────────────────────────────────────────────
const fake = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${FAKE_PORT}`);

  // The caller identifies itself through the access token it was given.
  const auth = req.headers["authorization"] || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  const key = Object.keys(USERS).find((k) => token.startsWith("token-" + k));
  const user = USERS[key || "sub-user"];

  if (req.method === "OPTIONS") return send(res, 204, "");

  if (url.pathname === "/auth/v1/user") {
    return send(res, 200, {
      id: user.id,
      aud: "authenticated",
      role: "authenticated",
      email: user.email,
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  if (url.pathname === "/rest/v1/subscriptions") {
    if (!user.subscribed) return send(res, 200, []);
    return send(res, 200, [
      {
        id: "sub-row-1",
        user_id: user.id,
        provider: "waffo",
        provider_customer_id: "cus_test",
        provider_subscription_id: "ps_test",
        status: "active",
        plan: "care",
        current_period_end: new Date(Date.now() + 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
  }

  if (url.pathname === "/rest/v1/rpc/consume_ai_usage") {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      let body = {};
      try {
        body = JSON.parse(raw || "{}");
      } catch {
        /* ignore */
      }
      const userId = body.p_user_id || user.id;
      const day = body.p_day || dayKey();
      const limit = Number(body.p_limit);

      const row = usage.get(userId);
      const used = row && row.day === day ? row.used : 0;
      let next = used;
      let allowed = false;
      if (used < limit) {
        next = used + 1;
        allowed = true;
      }
      usage.set(userId, { day, used: next });
      return send(res, 200, { used: next, allowed });
    });
    return;
  }

  if (url.pathname === "/rest/v1/ai_usage") {
    const rows = [...usage.entries()].map(([user_id, v]) => ({
      user_id,
      day: v.day,
      used: v.used,
    }));
    return send(res, 200, rows);
  }

  return send(res, 404, { message: "not found: " + req.method + " " + url.pathname });
});

// ── Helpers ────────────────────────────────────────────────────────────────

/** Build the Supabase SSR session cookie for a given fake user. */
function sessionCookie(userKey) {
  const user = USERS[userKey];
  const session = {
    access_token: "token-" + userKey,
    refresh_token: "refresh-" + userKey,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id: user.id,
      aud: "authenticated",
      role: "authenticated",
      email: user.email,
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
  // @supabase/ssr stores the session base64url-encoded with a "base64-" prefix.
  const encoded =
    "base64-" +
    Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  // The cookie name is sb-<hostname-first-part>-auth-token.
  return `sb-127-auth-token=${encoded}`;
}

function callAi(port, cookie) {
  return new Promise((resolve, reject) => {
    const headers = { "Content-Type": "application/json" };
    if (cookie) headers["Cookie"] = cookie;
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path: "/api/ai",
        method: "POST",
        headers,
      },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () =>
          resolve({ status: res.statusCode, headers: res.headers, body }),
        );
      },
    );
    req.on("error", reject);
    req.write(JSON.stringify({ message: "hello" }));
    req.end();
  });
}

function waitFor(url, tries = 90) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      const req = http.get(url, (res) => {
        res.resume();
        res.on("end", () => resolve());
      });
      req.on("error", () => {
        if (n <= 0) return reject(new Error("timeout waiting for " + url));
        setTimeout(() => attempt(n - 1), 500);
      });
    };
    attempt(tries);
  });
}

function startApp(port, extraEnv) {
  const env = { ...process.env, ...extraEnv };
  // Spawn Next directly (no npx) so the test does not depend on a shell.
  const nextBin = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
  const app = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
    cwd: ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  app.stdout.on("data", (d) => (log += d.toString()));
  app.stderr.on("data", (d) => (log += d.toString()));
  return { app, log: () => log };
}

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

async function main() {
  await new Promise((r) => fake.listen(FAKE_PORT, "127.0.0.1", r));
  console.log(`fake supabase on http://127.0.0.1:${FAKE_PORT}`);

  // ── Phase A: Supabase configured (real auth path) ──────────────────────
  const dbPath = path.join(ROOT, ".data", "smoke-ai-quota.db");
  try {
    fs.unlinkSync(dbPath);
  } catch {
    /* no previous run */
  }

  const envA = {
    NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${FAKE_PORT}`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    AI_MESSAGES_PER_DAY: String(LIMIT),
    LICENSE_GATE: "on",
    // A dedicated SQLite file so the test never touches the dev database.
    SQLITE_PATH: dbPath,
  };
  delete envA.SUPABASE_SERVICE_ROLE_KEY;

  const serverA = startApp(APP_PORT, envA);
  try {
    await waitFor(`http://127.0.0.1:${APP_PORT}/api/health`);
  } catch (err) {
    console.error("app did not start:\n" + serverA.log());
    serverA.app.kill();
    fake.close();
    process.exit(1);
  }

  const subCookie = sessionCookie("sub-user");
  const nosubCookie = sessionCookie("nosub-user");

  const r1 = await callAi(APP_PORT, subCookie);
  check(
    "call 1 succeeds (200)",
    r1.status === 200,
    `status=${r1.status} limit=${r1.headers["x-ai-quota-limit"]} used=${r1.headers["x-ai-quota-used"]} remaining=${r1.headers["x-ai-quota-remaining"]}`,
  );
  const r2 = await callAi(APP_PORT, subCookie);
  check(
    "call 2 succeeds (200)",
    r2.status === 200,
    `status=${r2.status} remaining=${r2.headers["x-ai-quota-remaining"]}`,
  );

  const r3 = await callAi(APP_PORT, subCookie);
  check("call 3 is refused (429)", r3.status === 429, `status=${r3.status}`);
  let r3json = {};
  try {
    r3json = JSON.parse(r3.body);
  } catch {
    /* keep empty */
  }
  check(
    "429 body carries a readable error",
    typeof r3json.error === "string" && r3json.error.length > 10,
    JSON.stringify(r3json),
  );

  // A quota reset must be in the FUTURE (the next 00:00 UTC), and Retry-After
  // must be the real number of seconds left — not a hardcoded 86400.
  const resetMs = Date.parse(r3json.resetAt);
  const retryAfter = Number(r3.headers["retry-after"]);
  check(
    "429 resetAt is the next UTC midnight (not today 00:00)",
    Number.isFinite(resetMs) &&
      resetMs > Date.now() &&
      resetMs - Date.now() <= 86_400_000,
    `resetAt=${r3json.resetAt}`,
  );
  check(
    "429 Retry-After matches the seconds left until reset",
    Number.isFinite(retryAfter) &&
      retryAfter > 0 &&
      retryAfter <= 86_400 &&
      Math.abs(retryAfter - Math.ceil((resetMs - Date.now()) / 1000)) <= 3,
    `Retry-After=${r3.headers["retry-after"]} resetAt=${r3json.resetAt}`,
  );

  const r4 = await callAi(APP_PORT, subCookie);
  check(
    "call 4 still 429 (counter persisted)",
    r4.status === 429,
    `status=${r4.status}`,
  );

  const rn = await callAi(APP_PORT, nosubCookie);
  check(
    "no subscription -> 402",
    rn.status === 402,
    `status=${rn.status} body=${rn.body}`,
  );

  // The counter really landed in the SQLite database.
  let rows = [];
  try {
    const { DatabaseSync } = require("node:sqlite");
    const db = new DatabaseSync(dbPath);
    rows = db.prepare("SELECT user_id, day, used FROM ai_usage").all();
    db.close();
  } catch (err) {
    check("SQLite ai_usage table readable", false, err.message);
  }
  const subRow = rows.find(
    (r) => r.user_id === USERS["sub-user"].id && r.day === dayKey(),
  );
  check(
    "quota counter persisted in SQLite",
    !!subRow && subRow.used === LIMIT,
    JSON.stringify(rows),
  );
  const nosubRow = rows.find((r) => r.user_id === USERS["nosub-user"].id);
  check(
    "the 402 request spent no quota",
    !nosubRow || nosubRow.used === 0,
    JSON.stringify(nosubRow ?? null),
  );

  serverA.app.kill();
  await new Promise((r) => setTimeout(r, 1500));

  // ── Phase B: no Supabase -> demo mode ──────────────────────────────────
  const envB = {
    AI_MESSAGES_PER_DAY: String(LIMIT),
    LICENSE_GATE: "on",
    // Enable the (production-closed) demo session explicitly so the demo
    // RAG/AI paths can be exercised.
    NEXT_PUBLIC_ENABLE_DEMO: "true",
    DEMO_IN_PRODUCTION: "true",
    SQLITE_PATH: dbPath,
  };
  delete envB.NEXT_PUBLIC_SUPABASE_URL;
  delete envB.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete envB.SUPABASE_SERVICE_ROLE_KEY;

  const serverB = startApp(DEMO_PORT, envB);
  try {
    await waitFor(`http://127.0.0.1:${DEMO_PORT}/api/health`);
  } catch (err) {
    console.error("demo app did not start:\n" + serverB.log());
    serverB.app.kill();
    fake.close();
    process.exit(1);
  }

  const demoStatuses = [];
  for (let i = 0; i < LIMIT + 2; i++) {
    demoStatuses.push((await callAi(DEMO_PORT, "sk_demo=1")).status);
  }
  check(
    "demo mode is not quota-limited",
    demoStatuses.every((s) => s === 200),
    "statuses=" + demoStatuses.join(","),
  );

  // The demo path must not appear in the counter table.
  let rows2 = [];
  try {
    const { DatabaseSync } = require("node:sqlite");
    const db = new DatabaseSync(dbPath);
    rows2 = db.prepare("SELECT user_id, day, used FROM ai_usage").all();
    db.close();
  } catch {
    /* ignore */
  }
  check(
    "demo mode spent no quota",
    !rows2.find((r) => r.user_id === "demo-user"),
    JSON.stringify(rows2),
  );

  serverB.app.kill();
  fake.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} smoke checks passed`);
  if (failed.length) {
    console.log("\napp log tail:\n" + serverA.log().slice(-2000));
    process.exit(1);
  }
  try {
    fs.unlinkSync(dbPath);
  } catch {
    /* ignore */
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
