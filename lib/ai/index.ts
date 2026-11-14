// Model providers via the Vercel AI SDK (the community-standard, MIT-licensed
// abstraction layer for Next.js apps) instead of hand-rolled SDK wrappers.
//
// The exported interface is unchanged - /api/ai, the RAG answer path and the
// demo fallbacks keep consuming chat()/streamChatChunks() exactly as before.
// What changed underneath: streaming protocol handling, tool-call plumbing
// and, importantly, TOKEN USAGE now come from the AI SDK's standardized
// `usage` fields, which feed the billing ledger (lib/billing.ts). Providers
// outside the first-party packages speak the OpenAI-compatible protocol via
// @ai-sdk/openai-compatible (DeepSeek/Groq/OpenRouter/Mistral/Cohere/xAI/
// Perplexity/Ollama all have documented OpenAI-compatible endpoints).

import { generateText, streamText, type ModelMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env } from "@/lib/env";
import { resolveAiConfig, type AiProviderKey, type ProviderConfig } from "./providers";
import { getRouting, recordUsage, estimateTokens } from "@/lib/billing";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/** Build the AI SDK language model for a resolved provider config. */
function languageModel(key: string, cfg: ProviderConfig) {
  if (cfg.kind === "anthropic") {
    return createAnthropic({ apiKey: cfg.apiKey }).chat(cfg.model);
  }
  if (cfg.kind === "gemini") {
    return createGoogleGenerativeAI({ apiKey: cfg.apiKey })(cfg.model);
  }
  // OpenAI itself gets the first-party provider; everything that speaks the
  // compatible protocol (custom OPENAI_BASE_URL, DeepSeek, Groq, OpenRouter,
  // Mistral, Cohere, xAI, Perplexity, Ollama...) uses the compatible one.
  if (key === "openai" && cfg.baseURL === "https://api.openai.com/v1") {
    return createOpenAI({ apiKey: cfg.apiKey }).chat(cfg.model);
  }
  return createOpenAICompatible({
    name: key,
    baseURL: cfg.baseURL,
    apiKey: cfg.apiKey,
  })(cfg.model);
}

/** provider key + effective config, honoring the admin routing override. */
async function effective(keyArg: string | undefined): Promise<{ key: string; cfg: ProviderConfig }> {
  const route = await getRouting("chat");
  const key = keyArg?.trim() || route?.provider || env.aiProvider();
  const base = resolveAiConfig(key);
  const cfg = route?.model ? { ...base, model: route.model } : base;
  return { key, cfg };
}

type SdkUsage = { inputTokens?: number; outputTokens?: number } | null | undefined;

async function meter(key: string, cfg: ProviderConfig, usage: SdkUsage, outChars?: number): Promise<void> {
  if (usage && (usage.inputTokens || usage.outputTokens)) {
    await recordUsage({
      lane: "chat",
      provider: key,
      model: cfg.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      source: "usage",
    });
    return;
  }
  const est = estimateTokens(outChars ?? 0);
  if (est.outputTokens > 0) {
    await recordUsage({
      lane: "chat",
      provider: key,
      model: cfg.model,
      outputTokens: est.outputTokens,
      source: "estimated",
    });
  }
}

/**
 * Send chat messages to the chosen provider and return a single string.
 * Provider/network errors are returned as a readable message (the UI must
 * never hard-fail on a misconfigured demo key).
 */
export async function chat(providerKey: string, messages: ChatMessage[]): Promise<string> {
  const { key, cfg } = await effective(providerKey);
  if (!cfg.apiKey) return "\n[AI error] No API key configured for this provider.";
  const { instructions, rest } = splitChatMessages(messages);
  try {
    const result = await generateText({
      model: languageModel(key, cfg),
      ...(instructions ? { instructions } : {}),
      messages: rest,
      temperature: 0.4,
    });
    await meter(key, cfg, result.usage as SdkUsage);
    return result.text;
  } catch (err) {
    return `\n[AI error] ${(err as Error).message}`;
  }
}

/**
 * Backwards-compatible helper used by older callers: falls back to the
 * configured default provider when none is requested.
 */
export async function streamChat(messages: ChatMessage[], provider?: string): Promise<string> {
  return chat(provider ?? "", messages);
}

/**
 * Whether the selected provider has an API key configured. /api/ai uses this
 * to decide between the built-in demo reply and a real (streamed) call.
 */
export function hasAiProviderKey(providerKey?: string): boolean {
  const key = providerKey && providerKey.trim() ? providerKey.trim() : env.aiProvider();
  return Boolean(resolveAiConfig(key).apiKey);
}

const NO_KEY_TEXT =
  "[AI] No API key is configured for the selected provider. " +
  "Add the matching key in .env.local to enable real streamed replies. " +
  "Until then the endpoint returns the built-in demo reply.";

/**
 * AI SDK v7 rejects system-role entries inside `messages`
 * ("System messages are not allowed in the prompt or fields - use the
 * instructions option instead"). Split once at the boundary so every caller
 * can keep passing the classic [{system},{user},...] shape.
 */
function splitChatMessages(messages: ChatMessage[]): {
  instructions: string;
  rest: ModelMessage[];
} {
  const instructions = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const rest = messages.filter((m) => m.role !== "system") as ModelMessage[];
  return { instructions, rest };
}

/**
 * Real token streaming via the AI SDK: each `yield` is one incremental text
 * chunk. Errors are deliberately NOT swallowed — a provider that has a key
 * but fails (bad key, balance, timeout, unknown model) throws, so the caller
 * can log the real error instead of surfacing a fake friendly answer. The v7
 * stream swallows failures into an empty textStream by default, so onError
 * is captured explicitly and re-thrown after the loop.
 */
export async function* streamChatChunks(
  providerKey: string | undefined,
  messages: ChatMessage[],
): AsyncGenerator<string> {
  const { key, cfg } = await effective(providerKey);
  if (!cfg.apiKey) {
    yield NO_KEY_TEXT;
    return;
  }
  const { instructions, rest } = splitChatMessages(messages);
  let streamError: Error | null = null;
  const result = streamText({
    model: languageModel(key, cfg),
    ...(instructions ? { instructions } : {}),
    messages: rest,
    temperature: 0.4,
    onError: (e) => {
      // AI SDK v7 hands onError an { error } wrapper, not the Error itself.
      const inner = (e as { error?: unknown })?.error ?? e;
      streamError =
        inner instanceof Error
          ? inner
          : new Error(String((inner as { message?: string })?.message ?? JSON.stringify(inner)));
    },
  });
  let outChars = 0;
  for await (const delta of result.textStream) {
    outChars += delta.length;
    yield delta;
  }
  if (streamError) throw streamError;
  // After the stream finishes the SDK resolves the usage it captured from
  // the provider's final chunk - exactly what the ledger needs.
  let usage: SdkUsage = null;
  try {
    usage = (await result.usage) as SdkUsage;
  } catch {
    usage = null;
  }
  await meter(key, cfg, usage, outChars);
}

export type { AiProviderKey };
