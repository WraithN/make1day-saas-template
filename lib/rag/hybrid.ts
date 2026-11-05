// Hybrid retrieval: BM25 (sparse/lexical) + dense embeddings (semantic),
// combined with Reciprocal Rank Fusion (RRF).
//
// Why RRF rather than a weighted sum of raw scores: BM25 scores and cosine
// similarities live on completely different scales, so summing them requires
// fragile normalisation. RRF only uses ranks:
//     score(d) = Σ  1 / (k + rank_i(d))     with k = 60
// A document found by BOTH branches ranks higher than one found by either.
//
// Graceful degradation is built in:
//   no embedding key      → BM25 only
//   no pgvector config    → in-memory vectors
//   pgvector unavailable  → local BM25 + in-memory vectors
// so /api/rag/query always returns something useful.

import { embedQuery } from "./embed";
import { bm25Search } from "./retrieve";
import {
  memoryVectorSearch,
  isPgvectorEnabled,
  pgHybridSearch,
} from "./vector";
import { allChunks, ensureSeededAsync } from "./store";
import type { RagChunk, RagHit, RetrievalInfo } from "./types";

const RRF_K = 60;

/** Fuse any number of ranked lists by reciprocal rank. */
export function rrfFuse(lists: RagHit[][], k: number): RagHit[] {
  const fused = new Map<string, { chunk: RagChunk; score: number }>();
  for (const list of lists) {
    list.forEach((hit, rank) => {
      const contribution = 1 / (RRF_K + rank + 1);
      const current = fused.get(hit.chunk.id);
      if (current) {
        current.score += contribution;
      } else {
        fused.set(hit.chunk.id, {
          chunk: hit.chunk,
          score: contribution,
        });
      }
    });
  }
  return [...fused.values()]
    .map((entry) => ({ ...entry, via: "rrf" as const }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

export type HybridResult = { hits: RagHit[]; info: RetrievalInfo };

/**
 * Retrieve the best passages for a question using every available branch.
 * `info` is returned to the API/UI so the retrieval strategy is observable
 * instead of a black box.
 */
export async function hybridSearch(
  question: string,
  k = 4,
): Promise<HybridResult> {
  // Seeds the store AND indexes any chunks that don't have a vector yet.
  await ensureSeededAsync();

  const candidateK = Math.max(k * 3, 12);
  const pgEnabled = isPgvectorEnabled();
  const queryVector = await embedQuery(question);

  let chunks: RagChunk[] = allChunks();
  let pgHits: RagHit[] = [];

  if (pgEnabled) {
    const remote = await pgHybridSearch(question, queryVector, candidateK);
    if (remote) {
      pgHits = remote.hits;
      // Postgres 'simple' FTS doesn't segment Chinese. Merge the remote
      // passages into the local corpus so our CJK-aware BM25 can also score
      // them, then fuse all three rank lists.
      const seen = new Set(chunks.map((c) => c.id));
      chunks = [
        ...chunks,
        ...remote.chunks.filter((c) => !seen.has(c.id)),
      ];
    }
  }

  const lexical = bm25Search(question, chunks, candidateK).map((hit) => ({
    ...hit,
    via: "bm25" as const,
  }));
  const semantic = queryVector
    ? memoryVectorSearch(queryVector, chunks, candidateK)
    : [];

  // Deduplicate identical chunk ids across the vector branches so a locally
  // indexed chunk that also came back from pgvector isn't counted twice.
  const pgIds = new Set(pgHits.map((h) => h.chunk.id));
  const localSemantic = semantic.filter((h) => !pgIds.has(h.chunk.id));

  const lists = [lexical, localSemantic, pgHits].filter((l) => l.length > 0);
  let strategy: RetrievalInfo["strategy"] = "bm25";
  if (lists.length > 1) strategy = "hybrid-rrf";
  else if (lexical.length === 0 && (localSemantic.length || pgHits.length)) {
    strategy = "vector";
  }

  const hits: RagHit[] =
    lists.length > 1
      ? rrfFuse(lists, k)
      : (lists[0] ?? []).slice(0, k);

  return {
    hits,
    info: {
      strategy,
      lexical: lexical.length,
      semantic: localSemantic.length,
      pgvector: pgHits.length,
      store: pgEnabled ? "pgvector" : "memory",
      embedding: Boolean(queryVector),
    },
  };
}
