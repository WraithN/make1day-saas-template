import { env } from "@/lib/env";

export type AiProviderKey =
  | "openai"
  | "openrouter"
  | "deepseek"
  | "groq"
  | "anthropic"
  | "gemini";

export type ProviderConfig =
  | { kind: "openai-compatible"; apiKey: string; baseURL: string; model: string }
  | { kind: "anthropic"; apiKey: string; model: string }
  | { kind: "gemini"; apiKey: string; model: string };

/**
 * Map a provider key to its concrete config. OpenAI / OpenRouter / DeepSeek /
 * Groq all speak the OpenAI chat-completions shape, so they share one client.
 */
export function resolveAiConfig(key: string): ProviderConfig {
  switch (key) {
    case "openrouter":
      return {
        kind: "openai-compatible",
        apiKey: env.openrouterApiKey(),
        baseURL: "https://openrouter.ai/api/v1",
        model: env.openrouterModel(),
      };
    case "deepseek":
      return {
        kind: "openai-compatible",
        apiKey: env.deepseekApiKey(),
        baseURL: "https://api.deepseek.com/v1",
        model: env.deepseekModel(),
      };
    case "groq":
      return {
        kind: "openai-compatible",
        apiKey: env.groqApiKey(),
        baseURL: "https://api.groq.com/openai/v1",
        model: env.groqModel(),
      };
    case "anthropic":
      return { kind: "anthropic", apiKey: env.anthropicApiKey(), model: env.anthropicModel() };
    case "gemini":
      return { kind: "gemini", apiKey: env.geminiApiKey(), model: env.geminiModel() };
    case "openai":
    default:
      return {
        kind: "openai-compatible",
        apiKey: env.openaiApiKey(),
        baseURL: env.openaiBaseUrl(),
        model: env.openaiModel(),
      };
  }
}

export const AI_PROVIDER_LABELS: Record<AiProviderKey, string> = {
  openai: "OpenAI",
  openrouter: "OpenRouter",
  deepseek: "DeepSeek",
  groq: "Groq",
  anthropic: "Anthropic",
  gemini: "Google Gemini",
};
