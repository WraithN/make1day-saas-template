// Document store for the RAG demo.
//
// Process-local by default: it makes the generated project runnable with zero
// external services. On ingest (and on the first seeded query) every chunk is
// also embedded into an in-memory vector cache — and, when
// RAG_VECTOR_STORE=supabase, persisted to pgvector via 0002_rag.sql.
// Search itself lives in hybrid.ts (BM25 + vectors + RRF).

import { chunkText } from "./chunk";
import { embedTexts } from "./embed";
import { putVectors, isPgvectorEnabled, pgUpsertChunks } from "./vector";
import type { RagChunk, RagDocument } from "./types";

type Stored = { doc: RagDocument; chunks: RagChunk[] };

// Keep the store on globalThis so dev HMR / duplicate module instances share it.
const globalRef = globalThis as unknown as {
  __shipkitRagStore?: Map<string, Stored>;
  __shipkitRagIndexed?: Set<string>;
  __shipkitRagIndexing?: Promise<void> | null;
};
const documents: Map<string, Stored> =
  globalRef.__shipkitRagStore ?? (globalRef.__shipkitRagStore = new Map());
const indexed: Set<string> =
  globalRef.__shipkitRagIndexed ?? (globalRef.__shipkitRagIndexed = new Set());

let sequence = 0;
function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${sequence}`;
}

export function ingestDocument(title: string, text: string): RagDocument {
  const id = nextId("doc");
  const chunks: RagChunk[] = chunkText(text).map((piece, index) => ({
    id: `${id}#${index}`,
    docId: id,
    title,
    text: piece,
    index,
  }));
  const doc: RagDocument = {
    id,
    title,
    chunks: chunks.length,
    createdAt: new Date().toISOString(),
  };
  documents.set(id, { doc, chunks });
  return doc;
}

/**
 * Ingest AND await vector indexing. Route handlers should use this so the
 * response is only returned once the document is searchable semantically.
 */
export async function ingestDocumentAsync(
  title: string,
  text: string,
): Promise<RagDocument> {
  const doc = ingestDocument(title, text);
  const stored = documents.get(doc.id);
  if (stored) await indexChunks(stored.chunks);
  return doc;
}

export function listDocuments(): RagDocument[] {
  // Show the seeded demo docs even before the first query.
  ensureSeeded();
  return [...documents.values()].map((entry) => entry.doc);
}

export function allChunks(): RagChunk[] {
  return [...documents.values()].flatMap((entry) => entry.chunks);
}

/** Generate + store vectors for chunks that don't have one yet. */
async function indexChunks(chunks: RagChunk[]): Promise<void> {
  const pending = chunks.filter((c) => !indexed.has(c.id));
  if (pending.length === 0) return;

  // Mark optimistically so concurrent queries don't pay for duplicate calls.
  pending.forEach((c) => indexed.add(c.id));

  const vectors = await embedTexts(
    pending.map((c) => `${c.title}\n${c.text}`),
  );
  if (!vectors || vectors.length !== pending.length) {
    // No key / transient failure → allow a later retry, but BM25 still works.
    pending.forEach((c) => indexed.delete(c.id));
    return;
  }

  const byId = new Map<string, number[]>();
  pending.forEach((c, i) => byId.set(c.id, vectors[i]));
  putVectors(pending.map((c) => ({ id: c.id, embedding: byId.get(c.id)! })));

  if (isPgvectorEnabled()) {
    const ok = await pgUpsertChunks(pending, byId);
    if (!ok) return; // vectors remain usable from the in-memory cache
  }
}

/** Seed + index in one awaited step; safe to call on every query. */
export async function ensureSeededAsync(): Promise<void> {
  ensureSeeded();
  if (indexed.size > 0 && [...documents.values()].every((d) =>
    d.chunks.every((c) => indexed.has(c.id)),
  )) {
    return;
  }
  // Coalesce concurrent first requests (serverless cold starts).
  if (!globalRef.__shipkitRagIndexing) {
    globalRef.__shipkitRagIndexing = indexChunks(allChunks()).finally(() => {
      globalRef.__shipkitRagIndexing = null;
    });
  }
  await globalRef.__shipkitRagIndexing;
}

// Seed docs make the very first query useful even before the user ingests
// anything. Mixed EN/ZH also demonstrates the tokenizer.
const SEED: { title: string; text: string }[] = [
  {
    title: "ShipKit pricing",
    text: `ShipKit uses a one-time buyout plus an optional care subscription.
The Free tier costs $0 and lets you evaluate the starter with the marketing site and documentation.
The Buyout tier is a one-time $99 payment at launch price, down from the $199 list price. It includes the complete source code, all features (auth, billing, AI, admin, multi-tenancy, RAG), and permanent ownership of the code you download.
The Care tier is $9 per month at launch price, down from the $19 list price. It includes upstream drift-proof patches, deployment assistance, priority support, new components each month, security and dependency updates, and compliance template updates.
Subscriptions renew automatically and can be cancelled at any time. Cancelling Care never revokes your buyout license or source code.
Compared with competitors, ShipFast costs about $199, Divjoy about $199, Makerkit about $299 and Supastarter about $299 for a one-time license.`,
  },
  {
    title: "技术架构 / Architecture",
    text: `ShipKit 基于 Next.js 15 App Router、React 19 与 TypeScript 构建。
认证使用 Supabase Auth，支持邮箱 magic link 以及 Google、GitHub、Apple、Microsoft 等 OAuth 登录；所有数据表都启用 row-level security。
计费通过 lib/payments 的 provider 抽象接入，本站默认使用 Waffo，也可切换 Stripe、Creem 或 PayPal；Webhook 验签后同步订阅状态。Waffo 的一次性买断发送 mode payment，Care 订阅发送 mode subscription。
AI 层是多供应商的：OpenAI 兼容接口、Anthropic Claude 与 Google Gemini 都通过 lib/ai 统一调用，聊天端点受登录与套餐限制。
样式系统使用一串 CSS 自定义属性（--bg、--surface、--accent 等），切换风格只需替换 :root 调色板。`,
  },
  {
    title: "RAG module guide",
    text: `The RAG module implements hybrid document question answering with citations.
POST /api/rag/ingest accepts { title, text } and returns the created document with its chunk count; chunks are embedded when an embedding key is available.
POST /api/rag/query accepts { question, provider? } and returns { answer, citations, mode, retrieval }.
Retrieval combines two complementary branches: Okapi BM25 over Latin words plus CJK unigrams and bigrams (lib/rag/retrieve.ts), and dense embeddings from an OpenAI-compatible /embeddings endpoint (lib/rag/embed.ts).
The two ranked lists are fused with Reciprocal Rank Fusion, RRF, using k = 60 in lib/rag/hybrid.ts. A passage found by both lexical and semantic search ranks higher than one found by either alone.
Vectors are cached in memory by default. Set RAG_VECTOR_STORE=supabase to persist them to pgvector with supabase/migrations/0002_rag.sql, which also provides a tsvector index and a SQL-side RRF function.
If no embedding key is configured, retrieval automatically degrades to BM25 only. If no AI chat key is configured, the answer falls back to extractive mode and returns the retrieved passages verbatim.
There is no LangChain, LlamaIndex or vector database client dependency: the whole pipeline is plain TypeScript.`,
  },
  {
    title: "Custom services / 定制服务",
    text: `ShipKit offers custom development as a separate 1:1 service. It is not a self-checkout plan: the work is scoped in a free 30-minute one-on-one call, then quoted as a fixed price before anything starts. There is no automatic charge and no obligation to proceed.
Scope includes custom components, themes and industry templates; private deployment, SSO, database and infrastructure integration; wiring the AI and RAG modules to your own data and models; and migrating an existing codebase, code audits and compliance work.
To start, use the Book a 1:1 call button on the pricing page, or email the contact address shown there. 定制服务需要先进行 1V1 沟通，确认需求范围后再给出固定报价，不会自动扣费。`,
  },
  {
    title: "Generated template docs / 模板文档",
    text: `Every ZIP downloaded from the Builder is agent-native: it contains a root AGENTS.md, a style-locked design.md, scoped rules in ai/rules/*.md, .cursor/rules/*.mdc for Cursor, CLAUDE.md for Claude Code, and up to 12 skills/*.md playbooks.
AGENTS.md is the root AI coding contract: the exact selected modules, which ones were pruned, repository layout, commands, scoped-rule index, server/client boundaries, the single /api/webhook payment rule, four-language i18n requirements, a style lock with concrete token values, and a definition of done.
design.md locks the visual system for the chosen style: colour tokens with hex references, the system font stack, corner radius, surface texture rules, component vocabulary, responsive breakpoints, accessibility rules and a do/don't checklist.
All of these documents are generated from one shared spec (ai/doc-spec.json + scripts/lib/ai-docs.mjs). Inside the downloaded project, npm run ai:docs rebuilds every document after a config change, and npm run ai:setup refreshes the Cursor and Claude Code integrations. 生成的模板会带上对应风格的 design.md 与 AGENTS.md，以及按选项生成的 scoped rules，方便直接用 AI coding 继续开发。`,
  },
];

export function ensureSeeded(): void {
  if (documents.size > 0) return;
  for (const doc of SEED) ingestDocument(doc.title, doc.text);
}
