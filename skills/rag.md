---
name: rag
description: Extend the hybrid RAG module (BM25 + dense embeddings + RRF) in a ShipKit project and keep the no-key fallback working.
globs: lib/rag/**, app/api/rag/**, components/RagDemo.tsx, app/rag/page.tsx
---

# Skill: Hybrid RAG (ShipKit)

This is a **working** implementation (strategy B), not a placeholder.

## Pipeline
1. `chunk.ts` — 480-char target chunks, 60-char overlap; Latin words + CJK uni/bigrams.
2. `retrieve.ts` — Okapi BM25 (`K1=1.5`, `B=0.75`) over the in-memory inverted index.
3. `embed.ts` — OpenAI-compatible `/embeddings`, batches of 32, pure `fetch`. Returns `null` when unconfigured.
4. `vector.ts` — cosine similarity; `RAG_VECTOR_STORE=supabase` switches to the pgvector RPC.
5. `hybrid.ts` — **Reciprocal Rank Fusion**, `k=60`, fuses BM25 / in-memory vector / pgvector lanes.
6. `index.ts` — `answerQuestion()` builds a top-4 prompt with `[n]` citations; falls back to extractive passages when no chat key exists.

## API
- `POST /api/rag/ingest` — `{ title, text }` → chunk, embed (async), index.
- `POST /api/rag/query` — `{ question, provider? }` → `{ answer, citations, mode, retrieval }`.
- `retrieval` reports strategy / embedding / lexical / semantic / pgvector / store so the UI can show *why* an answer appeared.

## Rules
- **Never require an API key to run the demo.** No embedding key → BM25-only. No chat key → extractive fallback. Both degradations must stay intact.
- `EMBEDDING_*` falls back to `OPENAI_*`, so one key covers chat + retrieval.
- The default store is `globalThis` memory: process-local, lost on restart. Serverless must use `RAG_VECTOR_STORE=supabase` + `0002_rag.sql`.
- Keep `EMBEDDING_DIMENSIONS=1536` aligned with the migration's `vector(1536)`.
- Citations must be 1-indexed and resolve to a real chunk id; do not invent source titles.

## Do / Don't
- DO expose retrieval metadata in responses — it is the honest differentiator.
- DO batch embedding calls; one request per chunk will rate-limit.
- DON'T add a vector DB dependency for the default path.
- DON'T claim "production RAG" when the store is still in-memory.

## Verify
Ingest a doc → query with no keys → expect `mode: "extractive"` and BM25 hits → add an embedding key → expect `retrieval.embedding` populated.
