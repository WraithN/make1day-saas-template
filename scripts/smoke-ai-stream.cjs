/**
 * Runtime smoke test for the AI streaming path and provider error handling.
 *
 * Starts a FAKE OpenAI-compatible SSE upstream plus a real `next start`, then
 * exercises /api/ai in demo mode:
 *
 *   1. the reply arrives in SEVERAL chunks over time (not one buffered blob)
 *   2. the chunks concatenate into the exact upstream text
 *   3. an upstream HTTP 401 ends the NDJSON stream with a provider_failed
 *      error event, no token text (and no quota charge), and the provider's
 *      internal message is NOT leaked to the browser
 *   4. the real upstream error IS written to the server log
 *
 * Usage: node scripts/smoke-ai-stream.cjs
 */
const http = require("node:http");
const { spawn } = require("node:child_process");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const FAKE_PORT = 54331;
const APP_PORT = 3103;
const TOKENS = ["Hello", ", ", "streamed ", "world", "!"];
const SECRET_PROVIDER_ERROR = "sk-fake-key-is-invalid-42";

const seen = { upstreamCalls: 0 };

// ── Fake OpenAI-compatible streaming upstream ────────────────────────────
const fake = http.createServer((req, res) => {
  let body = "";
  req.on("data", (d) => (body += d.toString()));
  req.on("end", () => {
    seen.upstreamCalls += 1;
    let parsed = {};
    try {
      parsed = JSON.parse(body);
    } catch {
      /* ignore */
    }
    const message = parsed?.messages?.at?.(-1)?.content ?? "";

    if (String(message).includes("TRIGGER_UPSTREAM_FAILURE")) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: {
            message: `Incorrect API key provided: ${SECRET_PROVIDER_ERROR}`,
            type: "invalid_request_error",
          },
        }),
      );
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    const frame = (delta) =>
      `data: ${JSON.stringify({
        id: "chatcmpl-smoke",
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model: "fake-model",
        choices: [{ index: 0, delta, finish_reason: delta ? null : "stop" }],
      })}\n\n`;

    // Flush one token at a time so buffering would be observable.
    let i = 0;
    const tick = () => {
      if (i < TOKENS.length) {
        res.write(frame({ content: TOKENS[i] }));
        i += 1;
        setTimeout(tick, 110);
        return;
      }
      // terminator frame: delta omitted, finish_reason "stop" (the SDK
      // rejects a stream that ends without an explicit finish reason)
      res.write(frame(null));
      res.write("data: [DONE]\n\n");
      res.end();
    };
    setTimeout(tick, 40);
  });
});

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

function startApp(port, extraEnv) {
  const env = { ...process.env, ...extraEnv };
  // Demo mode is available only when no auth backend is configured.
  delete env.NEXT_PUBLIC_SUPABASE_URL;
  delete env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete env.SUPABASE_SERVICE_ROLE_KEY;
  delete env.OPENAI_API_KEY;
  delete env.AI_PROVIDER;
  Object.assign(env, {
    OPENAI_API_KEY: "smoke-test-key",
    OPENAI_BASE_URL: `http://127.0.0.1:${FAKE_PORT}/v1`,
    AI_PROVIDER: "openai",
    LICENSE_GATE: "on",
    // Demo mode is the configured-provider preview path this test exercises
    // (it sends the sk_demo cookie). In production (next start) demo stays off
    // unless both flags are set, so enable it here to match the other suites.
    NEXT_PUBLIC_ENABLE_DEMO: "true",
    DEMO_IN_PRODUCTION: "true",
  });
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

/** Read a streaming response, recording when each chunk arrived. */
async function readStream(message) {
  const res = await fetch(`http://127.0.0.1:${APP_PORT}/api/ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: "sk_demo=1",
    },
    body: JSON.stringify({ message, provider: "openai" }),
  });
  const chunks = [];
  const times = [];
  if (!res.body) return { status: res.status, chunks, times, raw: "", text: "", events: [] };
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    times.push(Date.now());
    chunks.push(dec.decode(value, { stream: true }));
  }
  const raw = chunks.join("") + dec.decode();
  // NDJSON events from /api/ai (protocol v1): parse into token text + events.
  const events = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return { type: "unparsed", raw: l };
      }
    });
  const text = events
    .filter((e) => e.type === "token")
    .map((e) => e.text)
    .join("");
  return {
    status: res.status,
    chunks,
    times,
    raw,
    text,
    events,
  };
}

async function main() {
  await new Promise((r) => fake.listen(FAKE_PORT, "127.0.0.1", r));
  console.log(`fake OpenAI SSE upstream on http://127.0.0.1:${FAKE_PORT}`);

  const server = startApp(APP_PORT, {});
  try {
    await waitFor(`http://127.0.0.1:${APP_PORT}/api/health`);
  } catch (err) {
    console.error("app did not start:\n" + server.log());
    server.app.kill();
    fake.close();
    process.exit(1);
  }

  try {
    const ok = await readStream("give me a streamed hello");
    check("streaming request returns 200", ok.status === 200, `status=${ok.status}`);
    check(
      "reply arrives in multiple chunks (real streaming)",
      ok.chunks.length >= 3,
      `chunks=${ok.chunks.length}`,
    );
    const spread =
      ok.times.length > 1 ? ok.times[ok.times.length - 1] - ok.times[0] : 0;
    check(
      "chunks are spread over time, not buffered into one blob",
      spread >= 200,
      `spread=${spread}ms`,
    );
    check(
      "token events concatenate into the exact upstream text",
      ok.text === TOKENS.join(""),
      JSON.stringify(ok.text),
    );
    check(
      "stream is typed NDJSON with a clean done event",
      ok.events.some((e) => e.type === "start") &&
        ok.events.some((e) => e.type === "token") &&
        ok.events.some((e) => e.type === "done"),
      ok.events.map((e) => e.type).join(","),
    );
    check(
      "no demo/mock reply leaks into a configured-provider response",
      !ok.text.includes("demo reply"),
      JSON.stringify(ok.text),
    );

    const bad = await readStream("TRIGGER_UPSTREAM_FAILURE");
    check("upstream failure still returns 200 stream", bad.status === 200, `status=${bad.status}`);
    check(
      "upstream failure surfaces as a typed provider_failed error event (not prose)",
      bad.events.some((e) => e.type === "error" && e.code === "provider_failed"),
      bad.events.map((e) => e.type + (e.code ? ":" + e.code : "")).join(","),
    );
    check(
      "a failed provider emits NO token text (error is machine-detectable, not disguised as an answer)",
      bad.text === "",
      JSON.stringify(bad.text),
    );
    check(
      "provider internals are not leaked to the browser",
      !bad.raw.includes(SECRET_PROVIDER_ERROR),
      JSON.stringify(bad.raw.slice(0, 200)),
    );
    check(
      "upstream was actually called twice",
      seen.upstreamCalls === 2,
      `calls=${seen.upstreamCalls}`,
    );
    // Give the logger a moment to flush before inspecting the server output.
    await new Promise((r) => setTimeout(r, 150));
    check(
      "the real upstream error is written to the server log",
      server.log().includes("AI provider stream failed") &&
        server.log().includes(SECRET_PROVIDER_ERROR),
      `logTail=${server.log().slice(-220).replace(/\n/g, " ")}`,
    );
  } finally {
    server.app.kill();
    fake.close();
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} smoke checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
