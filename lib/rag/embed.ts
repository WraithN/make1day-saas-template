// Dense embeddings for the RAG module — intentionally dependency-free.
//
// The generator rewrites `lib/ai/index.ts` to contain only the providers the
// user selected, so RAG must NOT rely on an SDK method that may be pruned.
// This module talks to any OpenAI-compatible `/embeddings` endpoint with plain
// fetch. It works with OpenAI, OpenRouter, DeepSeek-compatible gateways, local
// Ollama / vLLM, etc. No key → returns null and the caller degrades to BM25.

import { env } from "@/lib/env";
import { getRouting, recordUsage } from "@/lib/billing";

export type EmbeddingConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  dimensions: number;
  /** Which env provider lane the key came from (ledger label only). */
  sourceProvider?: string;
};

/** Returns null when no embedding key is configured. */
export function embeddingConfig(): EmbeddingConfig | null {
  const apiKey = env.embeddingApiKey();
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: env.embeddingBaseUrl().replace(/\/+$/, ""),
    model: env.embeddingModel(),
    dimensions: env.embeddingDimensions(),
  };
}

type EmbeddingResponse = {
  data?: { index: number; embedding: number[] }[];
  usage?: { prompt_tokens?: number; total_tokens?: number };
  error?: { message?: string };
};

async function requestBatch(
  cfg: EmbeddingConfig,
  input: string[],
  withDimensions: boolean,
): Promise<number[][] | null> {
  const body: Record<string, unknown> = { model: cfg.model, input };
  // Some compatible gateways reject the `dimensions` field. We retry once
  // without it below rather than failing the whole retrieval path.
  if (withDimensions) body.dimensions = cfg.dimensions;

  const res = await fetch(`${cfg.baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return null;

  const json = (await res.json()) as EmbeddingResponse;
  if (!Array.isArray(json.data)) return null;
  const sorted = [...json.data].sort((a, b) => a.index - b.index);
  const vectors = sorted.map((d) => d.embedding);
  if (vectors.length !== input.length || vectors.some((v) => !Array.isArray(v))) {
    return null;
  }
  // Meter the retrieval spend: providers return real token usage here;
  // otherwise fall back to a ~4 chars/token estimate.
  const tokens = json.usage?.total_tokens ?? json.usage?.prompt_tokens ?? Math.round(input.join("").length / 4);
  await recordUsage({
    lane: "embed",
    provider: cfg.sourceProvider ?? env.aiProvider(),
    model: cfg.model,
    inputTokens: tokens,
    source: json.usage ? "usage" : "estimated",
  });
  return vectors;
}

const BATCH_SIZE = 32;

/** Embed a list of texts. Returns null on missing key / any API failure. */
export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  const base = embeddingConfig();
  if (!base || texts.length === 0) return null;
  // The /admin/models console can point embeddings at another model.
  const route = await getRouting("embed");
  const cfg = route?.model ? { ...base, model: route.model } : base;

  try {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      let vectors = await requestBatch(cfg, batch, true);
      if (!vectors) vectors = await requestBatch(cfg, batch, false);
      if (!vectors) return null;
      out.push(...vectors);
    }
    return out;
  } catch (err) {
    console.warn("RAG embedding unavailable, falling back to BM25:", err);
    return null;
  }
}

/** Embed a single query string. */
export async function embedQuery(text: string): Promise<number[] | null> {
  const result = await embedTexts([text]);
  return result?.[0] ?? null;
}
