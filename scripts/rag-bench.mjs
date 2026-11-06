// RAG benchmark — measures retrieval quality against a golden question set.
//
// It hits a running ShipKit server's /api/rag/query endpoint (zero-config:
// BM25-only retrieval works without any embedding key), checks whether the
// expected source document appears in the top-K citations, and reports a
// recall@K and MRR score. Use it to prove the RAG module actually retrieves
// the right passages, and to catch regressions.
//
// Usage:
//   node scripts/rag-bench.mjs [baseUrl] [--json]
//   BASE=http://localhost:3000 node scripts/rag-bench.mjs
//
// /api/rag/query is authenticated: it needs a signed-in account (401) with an
// active subscription (402). The default "sk_demo=1" cookie covers a template
// running in demo mode (no Supabase configured); with Supabase configured,
// point RAG_COOKIE at a real session cookie:
//
//   RAG_COOKIE="sb-xxx-auth-token=..." node scripts/rag-bench.mjs
//
// Exit code is non-zero if recall@4 falls below the threshold (CI gate).

const BASE = process.env.BASE || process.argv[2] || "http://localhost:3000";
const asJson = process.argv.includes("--json");
const K = 4;
const THRESHOLD = Number(process.env.BENCH_THRESHOLD || 0.9);
const COOKIE = process.env.RAG_COOKIE ?? "sk_demo=1";

// Golden set: each question should be answerable from exactly one seeded doc.
// `source` is the seeded document title that must surface in the top-K.
const GOLDEN = [
  { q: "How much does ShipKit cost?", source: "ShipKit pricing" },
  { q: "ShipKit 是用什么框架和语言构建的？", source: "技术架构 / Architecture" },
  { q: "How does the RAG module combine BM25 and embeddings?", source: "RAG module guide" },
  { q: "What does the Care subscription include?", source: "ShipKit pricing" },
  { q: "Does ShipKit generate an AGENTS.md for the downloaded project?", source: "Generated template docs / 模板文档" },
  { q: "ShipKit 支持哪些支付服务商？", source: "技术架构 / Architecture" },
  { q: "Is there a 1:1 custom development service?", source: "Custom services / 定制服务" },
  { q: "How do I index my own document into the RAG demo?", source: "RAG module guide" },
];

async function query(question) {
  const res = await fetch(`${BASE}/api/rag/query`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(COOKIE ? { cookie: COOKIE } : {}),
    },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 402) {
      throw new Error(
        `query failed: ${res.status} — /api/rag/query needs an authenticated ` +
          `account with an active subscription. The default cookie "sk_demo=1" ` +
          `works in demo mode; with Supabase configured, export ` +
          `RAG_COOKIE="<your session cookie>". ${body}`,
      );
    }
    throw new Error(`query failed: ${res.status} ${body}`);
  }
  return res.json();
}

async function main() {
  const rows = [];
  let hit = 0;
  let mrrSum = 0;

  for (const { q, source } of GOLDEN) {
    const data = await query(q);
    const titles = (data.citations || []).map((c) => c.title);
    const rank = titles.indexOf(source); // 0-based within the top-K list
    const inTopK = rank >= 0 && rank < K;
    if (inTopK) hit += 1;
    const mrr = rank >= 0 ? 1 / (rank + 1) : 0;
    mrrSum += mrr;
    rows.push({
      q,
      source,
      rank: rank >= 0 ? rank + 1 : null,
      hit: inTopK,
      mode: data.mode,
      strategy: data.retrieval?.strategy ?? null,
    });
  }

  const recall = hit / GOLDEN.length;
  const mrr = mrrSum / GOLDEN.length;

  if (asJson) {
    console.log(JSON.stringify({ base: BASE, k: K, recall, mrr, rows }, null, 2));
  } else {
    const pad = (s, n) => String(s).padEnd(n);
    console.log(`RAG benchmark — ${BASE}  (top-${K})\n`);
    console.log(`${pad("HIT", 5)} ${pad("RANK", 6)} ${pad("MODE", 12)} ${pad("SOURCE", 34)} QUESTION`);
    console.log("-".repeat(100));
    for (const r of rows) {
      console.log(
        `${pad(r.hit ? "yes" : "NO", 5)} ${pad(r.rank ?? "—", 6)} ${pad(r.mode ?? "—", 12)} ${pad(r.source.slice(0, 32), 34)} ${r.q}`,
      );
    }
    console.log("-".repeat(100));
    console.log(`Recall@${K}: ${(recall * 100).toFixed(1)}%   MRR: ${mrr.toFixed(3)}   (threshold ${(THRESHOLD * 100).toFixed(0)}%)`);
  }

  if (recall < THRESHOLD) {
    console.error(`\nFAIL: recall@${K} ${(recall * 100).toFixed(1)}% < ${THRESHOLD * 100}%`);
    process.exit(1);
  }
  console.log("\nPASS");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
