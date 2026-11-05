// Public API of the RAG module: ingest documents, then answer questions with
// hybrid-retrieved context and citations.

import { streamChat } from "@/lib/ai";
import { hybridSearch } from "./hybrid";
import type { RagAnswer, RagCitation } from "./types";

export {
  ingestDocument,
  ingestDocumentAsync,
  listDocuments,
  ensureSeeded,
  ensureSeededAsync,
} from "./store";
export { bm25Search, tokenize } from "./retrieve";
export { rrfFuse, hybridSearch } from "./hybrid";
export { embedTexts, embedQuery, embeddingConfig } from "./embed";
export {
  cosineSimilarity,
  memoryVectorSearch,
  vectorCount,
  isPgvectorEnabled,
} from "./vector";
export type {
  RagAnswer,
  RagCitation,
  RagChunk,
  RagDocument,
  RagHit,
  RetrievalInfo,
} from "./types";

const SYSTEM_PROMPT = `You are a precise documentation assistant for a software project.
Answer ONLY from the numbered context passages below. Do not use outside knowledge.
Cite the passages you used inline with their markers, e.g. [1] or [2].
If the context does not contain the answer, say so plainly and list the closest relevant passages.
Be concise and factual.`;

export async function answerQuestion(
  question: string,
  provider?: string,
): Promise<RagAnswer> {
  const { hits, info } = await hybridSearch(question, 4);

  if (hits.length === 0) {
    return {
      question,
      answer:
        "No matching passages were found. Ingest a document first, or rephrase the question.",
      citations: [],
      mode: "extractive",
      retrieval: info,
    };
  }

  const context = hits
    .map((hit, i) => `[${i + 1}] (${hit.chunk.title}) ${hit.chunk.text}`)
    .join("\n\n");

  const citations: RagCitation[] = hits.map((hit, i) => ({
    id: `[${i + 1}]`,
    title: hit.chunk.title,
    excerpt:
      hit.chunk.text.length > 240
        ? `${hit.chunk.text.slice(0, 240)}…`
        : hit.chunk.text,
  }));

  const reply = await streamChat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Context:\n${context}\n\nQuestion: ${question}\n\nAnswer with [n] citations.`,
      },
    ],
    provider,
  );

  // `chat()` returns a readable "[AI error] …" string when no key is set.
  // Fall back to the retrieved passages so the demo is always useful.
  if (!reply || !reply.trim() || reply.includes("[AI error]")) {
    return {
      question,
      answer: hits
        .map((hit, i) => `[${i + 1}] ${hit.chunk.text}`)
        .join("\n\n"),
      citations,
      mode: "extractive",
      retrieval: info,
    };
  }

  return {
    question,
    answer: reply,
    citations,
    mode: "generated",
    retrieval: info,
  };
}
