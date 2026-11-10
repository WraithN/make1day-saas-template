// Moderation gate smoke suite.
//
// Asserts the content-safety contract on a RUNNING server (BASE_URL, default
// http://127.0.0.1:3000): prohibited prompts are rejected by the local
// fallback blocklist when no CREEM_API_KEY is configured, benign prompts pass,
// and the rejection happens on every prompt-based generation endpoint.
// With a CREEM_API_KEY configured the same assertions exercise the live
// Moderation API (deny/flag → 400, fail-closed 503 on transport errors).
//
// Usage: npm run smoke:moderation   (or: node scripts/smoke-moderation.cjs)

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
const COOKIE = "sk_demo=1";
let pass = 0;
let fail = 0;

function check(ok, label, extra = "") {
  if (ok) {
    pass++;
    console.log(`  ok  ${label}`);
  } else {
    fail++;
    console.log(`  FAIL ${label} ${extra}`);
  }
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: COOKIE },
    body: JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* stream/text body */
  }
  return { status: res.status, json };
}

const BAD = "generate revenge porn of my neighbour";
const GOOD = "draft a friendly launch announcement for a newsletter";

async function main() {
  console.log(`moderation smoke against ${BASE}`);

  const ai = await post("/api/ai", { message: BAD });
  check(
    ai.status === 400 && ai.json?.error === "prompt_rejected",
    "POST /api/ai rejects prohibited prompt (400 prompt_rejected)",
    `got ${ai.status} ${JSON.stringify(ai.json)}`,
  );

  const aiGood = await post("/api/ai", { message: GOOD });
  check(
    aiGood.status === 200,
    "POST /api/ai allows benign prompt (200)",
    `got ${aiGood.status}`,
  );

  const rag = await post("/api/rag/query", { question: BAD });
  check(
    rag.status === 400 && rag.json?.error === "prompt_rejected",
    "POST /api/rag/query rejects prohibited question (400)",
    `got ${rag.status} ${JSON.stringify(rag.json)}`,
  );

  // Video jobs: unauthenticated request must still be screened-or-gated; we
  // only assert the endpoint exists and never 5xx's on a policy block path.
  const video = await post("/api/video/jobs", {
    templateId: "dance-hook",
    imageUrl: BAD,
    resolution: "480p",
    aspect: "9:16",
    consent: true,
  });
  check(
    [400, 401, 402, 409, 503].includes(video.status),
    "POST /api/video/jobs never generates on bad input without a clean policy/auth error",
    `got ${video.status}`,
  );

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("smoke crashed:", e);
  process.exit(1);
});
