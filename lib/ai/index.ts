import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "@/lib/env";
import { resolveAiConfig, type AiProviderKey } from "./providers";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

// ── Lazy client caches (constructed on first use, never at import time) ──
const openaiCache = new Map<string, OpenAI>();
let _anthropic: Anthropic | null = null;
let _gemini: GoogleGenerativeAI | null = null;

function openaiClient(baseURL: string, apiKey: string): OpenAI {
  const cacheKey = `${baseURL}::${apiKey}`;
  let c = openaiCache.get(cacheKey);
  if (!c) {
    c = new OpenAI({ apiKey, baseURL });
    openaiCache.set(cacheKey, c);
  }
  return c;
}

function anthropicClient(apiKey: string): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey });
  return _anthropic;
}

function geminiClient(apiKey: string): GoogleGenerativeAI {
  if (!_gemini) _gemini = new GoogleGenerativeAI(apiKey);
  return _gemini;
}

/**
 * Send chat messages to the chosen provider and return a single string.
 * Any provider/network error is swallowed and returned as a readable message
 * so the UI never hard-fails (handy for demos on a misconfigured key).
 */
export async function chat(providerKey: string, messages: ChatMessage[]): Promise<string> {
  const cfg = resolveAiConfig(providerKey);

  if (cfg.kind === "openai-compatible") {
    if (!cfg.apiKey) return "\n[AI error] No API key configured for this provider.";
    try {
      const client = openaiClient(cfg.baseURL, cfg.apiKey);
      const completion = await client.chat.completions.create({
        model: cfg.model,
        messages,
        stream: false,
        temperature: 0.4,
      });
      return completion.choices[0]?.message?.content ?? "";
    } catch (err) {
      return `\n[AI error] ${(err as Error).message}`;
    }
  }

  if (cfg.kind === "anthropic") {
    if (!cfg.apiKey) return "\n[AI error] No Anthropic API key configured.";
    try {
      const client = anthropicClient(cfg.apiKey);
      const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
      const conv = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
      const msg = await client.messages.create({
        model: cfg.model,
        max_tokens: 1024,
        system: system || undefined,
        messages: conv,
      });
      return msg.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("");
    } catch (err) {
      return `\n[AI error] ${(err as Error).message}`;
    }
  }

  if (cfg.kind === "gemini") {
    if (!cfg.apiKey) return "\n[AI error] No Gemini API key configured.";
    try {
      const client = geminiClient(cfg.apiKey);
      const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
      const contents = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));
      const model = client.getGenerativeModel({
        model: cfg.model,
        systemInstruction: system || undefined,
      });
      const result = await model.generateContent({ contents });
      return result.response.text();
    } catch (err) {
      return `\n[AI error] ${(err as Error).message}`;
    }
  }

  return "\n[AI error] Unknown provider.";
}

/**
 * Backwards-compatible helper used by /api/ai. Falls back to the configured
 * default provider when none is requested.
 */
export async function streamChat(messages: ChatMessage[], provider?: string): Promise<string> {
  const key = provider && provider.trim() ? provider.trim() : env.aiProvider();
  return chat(key, messages);
}

/**
 * Whether the selected provider has an API key configured. /api/ai uses this
 * to decide between the built-in demo reply and a real (streamed) call, so a
 * configured-but-broken provider never masquerades as a normal answer.
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
 * Real token streaming: each `yield` is one incremental text chunk from the
 * provider. Errors are deliberately NOT swallowed — a provider that has a key
 * but fails (bad key, insufficient balance, timeout, unknown model) throws, so
 * the caller can log the real error and surface a clear failure instead of a
 * fake friendly answer.
 */
export async function* streamChatChunks(
  providerKey: string | undefined,
  messages: ChatMessage[],
): AsyncGenerator<string> {
  const cfg = resolveAiConfig(
    providerKey && providerKey.trim() ? providerKey.trim() : env.aiProvider(),
  );

  if (cfg.kind === "openai-compatible") {
    if (!cfg.apiKey) {
      yield NO_KEY_TEXT;
      return;
    }
    const client = openaiClient(cfg.baseURL, cfg.apiKey);
    const completion = await client.chat.completions.create({
      model: cfg.model,
      messages,
      stream: true,
      temperature: 0.4,
    });
    for await (const chunk of completion) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) yield text;
    }
    return;
  }

  if (cfg.kind === "anthropic") {
    if (!cfg.apiKey) {
      yield NO_KEY_TEXT;
      return;
    }
    const client = anthropicClient(cfg.apiKey);
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
    const conv = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    const stream = await client.messages.create({
      model: cfg.model,
      max_tokens: 1024,
      system: system || undefined,
      messages: conv,
      stream: true,
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
    return;
  }

  if (cfg.kind === "gemini") {
    if (!cfg.apiKey) {
      yield NO_KEY_TEXT;
      return;
    }
    const client = geminiClient(cfg.apiKey);
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
    const model = client.getGenerativeModel({
      model: cfg.model,
      systemInstruction: system || undefined,
    });
    const result = await model.generateContentStream({ contents });
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
    return;
  }
}

export type { AiProviderKey };
