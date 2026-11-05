// BM25 retrieval — pure TypeScript, no vector DB or embedding API required.
// That means the generated scaffold has a *working* RAG demo out of the box,
// even before any AI keys are configured. Swap this file for a pgvector /
// embeddings implementation when you go to production (see
// supabase/migrations/0002_rag.sql).

import type { RagChunk, RagHit } from "./types";

/**
 * Latin words + CJK unigrams and bigrams, so English and Chinese queries both
 * match without needing a language-specific tokenizer dependency.
 */
export function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  const latin = lower.match(/[a-z0-9_]+/g) ?? [];
  const runs = lower.match(/[\u3400-\u9fff]+/g) ?? [];
  const cjk: string[] = [];
  for (const run of runs) {
    for (let i = 0; i < run.length; i++) {
      cjk.push(run[i]);
      if (i + 1 < run.length) cjk.push(run.slice(i, i + 2));
    }
  }
  return [...latin, ...cjk];
}

/** Okapi BM25 over the in-memory chunk corpus. */
export function bm25Search(
  query: string,
  chunks: RagChunk[],
  k = 4,
): RagHit[] {
  const queryTokens = tokenize(query);
  if (!queryTokens.length || !chunks.length) return [];

  const K1 = 1.5;
  const B = 0.75;

  const docs = chunks.map((chunk) => ({
    chunk,
    tf: new Map<string, number>(),
    len: 0,
  }));
  const df = new Map<string, number>();

  for (const doc of docs) {
    const tokens = tokenize(`${doc.chunk.title} ${doc.chunk.text}`);
    doc.len = tokens.length;
    for (const token of tokens) {
      doc.tf.set(token, (doc.tf.get(token) ?? 0) + 1);
    }
    for (const token of new Set(tokens)) {
      df.set(token, (df.get(token) ?? 0) + 1);
    }
  }

  const totalLen = docs.reduce((sum, d) => sum + d.len, 0);
  const avgdl = totalLen / docs.length || 1;
  const N = docs.length;
  const idf = (term: string) => {
    const n = df.get(term) ?? 0;
    return Math.log(1 + (N - n + 0.5) / (n + 0.5));
  };

  const queryTf = new Map<string, number>();
  for (const token of queryTokens) {
    queryTf.set(token, (queryTf.get(token) ?? 0) + 1);
  }

  const scored = docs.map((doc) => {
    let score = 0;
    for (const [term, qFreq] of queryTf) {
      const freq = doc.tf.get(term) ?? 0;
      if (!freq) continue;
      const denom = freq + K1 * (1 - B + B * (doc.len / avgdl));
      score +=
        idf(term) *
        ((freq * (K1 + 1)) / denom) *
        (1 + Math.log(1 + qFreq));
    }
    return { chunk: doc.chunk, score };
  });

  return scored
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
