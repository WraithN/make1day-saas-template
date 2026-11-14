/**
 * Runtime smoke test for the AI quota on the SUPABASE backend.
 *
 * The local-SQLite variant lives in scripts/smoke-ai-quota.cjs. This one
 * points the app at a fake Supabase WITH a service-role key, so lib/ai-usage.ts
 * takes the Supabase branch and calls the consume_ai_usage RPC from
 * supabase/migrations/0009_ai_usage.sql.
 *
 * Checks:
 *   1. calls 1+2 pass, call 3 = 429
 *   2. the fake Supabase actually received the RPC (atomic path, no fallback)
 *   3. the counter really landed in the Supabase table
 *
 * Usage: node scripts/smoke-ai-quota-supabase.cjs
 */
const http = require("node:http");
const { spawn } = require("node:child_process");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const FAKE_PORT = 54330;
const APP_PORT = 3102;
const LIMIT = 2;

const USER = {
  id: "33333333-3333-4333-8333-333333333333",
  email: "supabase@example.com",
};

const usage = new Map();
let rpcCalls = 0;
let rpcPayloads = [];

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

const fake = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${FAKE_PORT}`);

  if (req.method === "OPTIONS") return send(res, 204, "");

  if (url.pathname === "/auth/v1/user") {
    return send(res, 200, {
      id: USER.id,
      aud: "authenticated",
      role: "authenticated",
      email: USER.email,
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  if (url.pathname === "/rest/v1/subscriptions") {
    return send(res, 200, [
      {
        id: "sub-row-1",
        user_id: USER.id,
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
      rpcCalls++;
      let body = {};
      try {
        body = JSON.parse(raw || "{}");
      } catch {
        /* ignore */
      }
      rpcPayloads.push(body);

      const userId = body.p_user_id || USER.id;
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

function sessionCookie() {
  const session = {
    access_token: "token-supabase-user",
    refresh_token: "refresh-supabase-user",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id: USER.id,
      aud: "authenticated",
      role: "authenticated",
      email: USER.email,
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
  const encoded =
    "base64-" +
    Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  return `sb-127-auth-token=${encoded}`;
}

function callAi(cookie) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port: APP_PORT,
        path: "/api/ai",
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
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

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

async function main() {
  await new Promise((r) => fake.listen(FAKE_PORT, "127.0.0.1", r));
  console.log(`fake supabase on http://127.0.0.1:${FAKE_PORT}`);

  const env = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${FAKE_PORT}`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    // A service-role key switches lib/ai-usage.ts to the Supabase branch.
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    AI_MESSAGES_PER_DAY: String(LIMIT),
    LICENSE_GATE: "on",
  };

  const nextBin = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
  const app = spawn(process.execPath, [nextBin, "start", "-p", String(APP_PORT)], {
    cwd: ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  app.stdout.on("data", (d) => (log += d.toString()));
  app.stderr.on("data", (d) => (log += d.toString()));

  try {
    await waitFor(`http://127.0.0.1:${APP_PORT}/api/health`);
  } catch {
    console.error("app did not start:\n" + log);
    app.kill();
    fake.close();
    process.exit(1);
  }

  const cookie = sessionCookie();
  const r1 = await callAi(cookie);
  check("call 1 succeeds (200)", r1.status === 200, `status=${r1.status}`);
  const r2 = await callAi(cookie);
  check("call 2 succeeds (200)", r2.status === 200, `status=${r2.status}`);
  const r3 = await callAi(cookie);
  check("call 3 is refused (429)", r3.status === 429, `status=${r3.status}`);

  check(
    "the Supabase RPC was used for the two GENERATED replies (429 refusal is a read-only pre-check that must not reach the RPC)",
    rpcCalls === 2,
    `rpcCalls=${rpcCalls} payloads=${JSON.stringify(rpcPayloads)}`,
  );
  check(
    "the RPC received the user id, UTC day and limit",
    rpcPayloads.length > 0 &&
      rpcPayloads[0].p_user_id === USER.id &&
      rpcPayloads[0].p_day === dayKey() &&
      Number(rpcPayloads[0].p_limit) === LIMIT,
    JSON.stringify(rpcPayloads[0] ?? null),
  );

  const row = usage.get(USER.id);
  check(
    "the counter landed in the Supabase table",
    !!row && row.used === LIMIT && row.day === dayKey(),
    JSON.stringify(row ?? null),
  );

  app.kill();
  fake.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} supabase smoke checks passed`);
  if (failed.length) {
    console.log("\napp log tail:\n" + log.slice(-2000));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
