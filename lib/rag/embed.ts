// Dense embeddings for the RAG module.
//
// Talks to any OpenAI-compatible `/embeddings` endpoint through the official
// `openai` SDK (the community-standard client; baseURL-swappable for
// OpenRouter / DeepSeek / Ollama / vLLM). No key → returns null and the
// caller degrades to BM25. Token usage is metered into the billing ledger.

import OpenAI from "openai";
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

// Shared clients per (baseURL, key) - the SDK handles retries/errors for us.
const clients = new Map<string, OpenAI>();
function openaiFor(cfg: EmbeddingConfig): OpenAI {
  const k = cfg.baseUrl + "::" + cfg.apiKey.slice(-6);
  let c = clients.get(k);
  if (!c) {
    c = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseUrl });
    clients.set(k, c);
  }
  return c;
}

async function requestBatch(
  cfg: EmbeddingConfig,
  input: string[],
  withDimensions: boolean,
): Promise<number[][] | null> {
  try {
    const res = await openaiFor(cfg).embeddings.create({
      model: cfg.model,
      input,
      ...(withDimensions ? { dimensions: cfg.dimensions } : {}),
    });
    const vectors = [...res.data].sort((a, b) => a.index - b.index).map((d) => d.embedding);
    if (vectors.length !== input.length || vectors.some((v) => !Array.isArray(v))) {
      return null;
    }
    // Retrieval spend metering: OpenAI-compatible /embeddings responses carry
    // total_tokens; anything missing falls back to a char estimate.
    const tokens = res.usage?.total_tokens ?? res.usage?.prompt_tokens ?? Math.round(input.join("").length / 4);
    await recordUsage({
      lane: "embed",
      provider: cfg.sourceProvider ?? env.aiProvider(),
      model: cfg.model,
      inputTokens: tokens,
      source: res.usage ? "usage" : "estimated",
    });
    return vectors;
  } catch {
    // Any SDK error (rejection, 4xx, timeout) degrades to BM25 upstream.
    return null;
  }
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

