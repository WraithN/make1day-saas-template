// Shared types for the RAG (document Q&A) module.

/** A single searchable passage produced by `chunkText()`. */
export interface RagChunk {
  id: string;
  docId: string;
  title: string;
  text: string;
  index: number;
}

/** A retrieved passage with its relevance score. */
export interface RagHit {
  chunk: RagChunk;
  score: number;
  /** Which retrieval branch produced this hit (diagnostics only). */
  via?: "bm25" | "vector" | "pgvector" | "rrf";
}

export interface RagDocument {
  id: string;
  title: string;
  chunks: number;
  createdAt: string;
}

export interface RagCitation {
  /** Renderable marker, e.g. "[1]". */
  id: string;
  title: string;
  excerpt: string;
}

/** Which strategy actually produced the answer's context. */
export type RetrievalInfo = {
  /** "hybrid-rrf" when two or more branches were fused. */
  strategy: "hybrid-rrf" | "bm25" | "vector";
  /** Number of candidates from each branch before fusion. */
  lexical: number;
  semantic: number;
  pgvector: number;
  /** "pgvector" when Supabase persistence is active, otherwise "memory". */
  store: "memory" | "pgvector";
  /** Whether an embedding key was available for this query. */
  embedding: boolean;
};

export interface RagAnswer {
  question: string;
  answer: string;
  citations: RagCitation[];
  /**
   * "generated"  → an LLM answered from the retrieved context.
   * "extractive" → no usable AI key (or no match); the passages are returned
   *                verbatim so the demo always produces a useful result.
   */
  mode: "generated" | "extractive";
  retrieval: RetrievalInfo;
}
