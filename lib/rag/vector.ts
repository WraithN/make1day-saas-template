// Vector storage + retrieval for the hybrid RAG pipeline.
//
// Two backends:
//  * "memory" (default): vectors live in a globalThis Map alongside the
//    in-memory document store. Zero configuration, process-local.
//  * "supabase": vectors are persisted to pgvector through the REST API and
//    the SQL-side RRF function in supabase/migrations/0002_rag.sql.
//
// Both are optional. Any failure falls back to BM25 so a query never 500s
// because an embedding service or a database is down.

import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { RagChunk, RagHit } from "./types";

const PG_DIMENSIONS = 1536; // must match vector(1536) in 0002_rag.sql

const globalRef = globalThis as unknown as {
  __shipkitRagVectors?: Map<string, number[]>;
  __shipkitRagPgWarned?: boolean;
};

const vectors: Map<string, number[]> =
  globalRef.__shipkitRagVectors ??
  (globalRef.__shipkitRagVectors = new Map());

export function putVectors(
  entries: { id: string; embedding: number[] }[],
): void {
  for (const e of entries) vectors.set(e.id, e.embedding);
}

export function vectorCount(): number {
  return vectors.size;
}

/** Cosine similarity; returns 0 for degenerate or mismatched vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Dense retrieval over the in-memory vector cache. */
export function memoryVectorSearch(
  queryVector: number[],
  chunks: RagChunk[],
  k = 12,
): RagHit[] {
  return chunks
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryVector, vectors.get(chunk.id) ?? []),
      via: "vector" as const,
    }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

/** Whether pgvector persistence is fully configured. */
export function isPgvectorEnabled(): boolean {
  if (env.ragVectorStore() !== "supabase") return false;
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return false;
  }
  if (env.embeddingDimensions() !== PG_DIMENSIONS) {
    if (!globalRef.__shipkitRagPgWarned) {
      globalRef.__shipkitRagPgWarned = true;
      console.warn(
        `RAG pgvector requires EMBEDDING_DIMENSIONS=${PG_DIMENSIONS}; ` +
          `using the in-memory vector store instead.`,
      );
    }
    return false;
  }
  return true;
}

function toPgVector(v: number[]): string {
  return `[${v.join(",")}]`;
}

/** Persist documents + chunks with their embeddings to Supabase/pgvector. */
export async function pgUpsertChunks(
  chunks: RagChunk[],
  embeddings: Map<string, number[]>,
): Promise<boolean> {
  if (!isPgvectorEnabled() || chunks.length === 0) return false;
  try {
    const admin = createSupabaseAdminClient();
    const docs = new Map<string, { id: string; title: string }>();
    for (const c of chunks) {
      docs.set(c.docId, { id: c.docId, title: c.title });
    }
    const { error: docError } = await admin
      .from("rag_documents")
      .upsert([...docs.values()], { onConflict: "id" });
    if (docError) throw docError;

    const rows = chunks.flatMap((c) => {
      const embedding = embeddings.get(c.id);
      return embedding
        ? [
            {
              id: c.id,
              doc_id: c.docId,
              chunk_index: c.index,
              title: c.title,
              content: c.text,
              embedding: toPgVector(embedding),
            },
          ]
        : [];
    });
    if (rows.length === 0) return false;
    const { error } = await admin
      .from("rag_chunks")
      .upsert(rows, { onConflict: "id" });
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("RAG pgvector upsert failed (BM25 fallback remains):", err);
    return false;
  }
}

type HybridRow = {
  id: string;
  doc_id: string;
  title: string;
  content: string;
  chunk_index: number;
  score: number;
  from_lexical?: boolean;
  from_semantic?: boolean;
};

/**
 * SQL-side hybrid retrieval: Postgres full-text (tsvector) + cosine ANN,
 * fused with RRF inside `match_rag_chunks_hybrid`. Returns both the ranked
 * hits and the underlying chunks so the caller can also run local BM25 over
 * remote documents (important for Chinese, which `simple` doesn't segment).
 */
export async function pgHybridSearch(
  question: string,
  queryVector: number[] | null,
  k = 12,
): Promise<{ hits: RagHit[]; chunks: RagChunk[] } | null> {
  if (!isPgvectorEnabled()) return null;
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc("match_rag_chunks_hybrid", {
      query_embedding: queryVector ? toPgVector(queryVector) : null,
      query_text: question,
      candidate_count: Math.max(k * 3, 20),
      match_count: k,
    });
    if (error) throw error;
    const rows = (data ?? []) as HybridRow[];
    const chunks: RagChunk[] = rows.map((r) => ({
      id: r.id,
      docId: r.doc_id,
      title: r.title,
      text: r.content,
      index: r.chunk_index,
    }));
    const hits: RagHit[] = rows.map((r, i) => ({
      chunk: chunks[i],
      score: Number(r.score) || 0,
      via: "pgvector" as const,
    }));
    return { hits, chunks };
  } catch (err) {
    console.warn("RAG pgvector search failed (BM25 fallback remains):", err);
    return null;
  }
}
