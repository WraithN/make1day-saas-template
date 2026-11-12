import { getLang } from "@/lib/i18n-server";
import { consoleCopy } from "@/lib/content/console";
import { env } from "@/lib/env";
import { waffoSiftEnabled, moderationConfigured } from "@/lib/moderation";
import { getAiUsageSummary } from "@/lib/ai-usage";
import {
  ConsoleSection,
  ConsoleTable,
  KeyValue,
  Notice,
} from "@/components/console/ConsoleUI";

export const dynamic = "force-dynamic";

// Show the first and last characters of a secret only — the value itself
// never leaves the server, and this page is a screenshot-prone console.
function mask(value: string): string {
  if (!value) return "—";
  if (value.length <= 8) return "••••";
  return value.slice(0, 3) + "…" + value.slice(-2);
}

const CHAT_LANES: {
  key: string;
  label: string;
  hasKey: () => string;
  model: () => string;
  baseUrl?: () => string;
}[] = [
  { key: "openai", label: "OpenAI-compatible", hasKey: () => env.openaiApiKey(), model: () => env.openaiModel(), baseUrl: () => env.openaiBaseUrl() },
  { key: "anthropic", label: "Anthropic", hasKey: () => env.anthropicApiKey(), model: () => env.anthropicModel() },
  { key: "gemini", label: "Google Gemini", hasKey: () => env.geminiApiKey(), model: () => env.geminiModel() },
  { key: "openrouter", label: "OpenRouter", hasKey: () => env.openrouterApiKey(), model: () => env.openrouterModel() },
  { key: "deepseek", label: "DeepSeek", hasKey: () => env.deepseekApiKey(), model: () => env.deepseekModel() },
  { key: "groq", label: "Groq", hasKey: () => env.groqApiKey(), model: () => env.groqModel() },
  { key: "mistral", label: "Mistral", hasKey: () => env.mistralApiKey(), model: () => env.mistralModel(), baseUrl: () => env.mistralBaseUrl() },
  { key: "cohere", label: "Cohere", hasKey: () => env.cohereApiKey(), model: () => env.cohereModel(), baseUrl: () => env.cohereBaseUrl() },
  { key: "xai", label: "xAI Grok", hasKey: () => env.xaiApiKey(), model: () => env.xaiModel(), baseUrl: () => env.xaiBaseUrl() },
  { key: "perplexity", label: "Perplexity", hasKey: () => env.perplexityApiKey(), model: () => env.perplexityModel(), baseUrl: () => env.perplexityBaseUrl() },
  { key: "ollama", label: "Ollama (self-hosted)", hasKey: () => env.ollamaApiKey(), model: () => env.ollamaModel(), baseUrl: () => env.ollamaBaseUrl() },
];

export default async function AdminModelsPage() {
  const lang = await getLang();
  const c = consoleCopy(lang);
  const active = env.aiProvider();

  let usage = null as null | Awaited<ReturnType<typeof getAiUsageSummary>>;
  try {
    usage = await getAiUsageSummary();
  } catch {
    // usage store unavailable → the quota rows simply show "—"
  }

  const falKey = (process.env.FAL_KEY ?? "").trim();
  const falModel = (process.env.VIDEO_FAL_MODEL ?? "").trim() || "fal-ai/face-swap/video";

  return (
    <div className="max-w-3xl space-y-6">
      <ConsoleSection title={c["admin.models.title"]} desc={c["admin.models.subtitle"]}>
        <KeyValue
          rows={[
            { key: c["admin.models.activeLane"], value: `${c["admin.models.provider"]}: ${active}` },
            {
              key: c["admin.models.chatModel"],
              value:
                CHAT_LANES.find((l) => l.key === active)?.model() ??
                env.openaiModel(),
            },
            { key: c["admin.models.quota"], value: String(env.aiMessagesPerDay()) },
            {
              key: c["admin.models.usedToday"],
              value: usage
                ? `${usage.calls} · ${usage.activeUsers} ${c["admin.models.users"]}`
                : "—",
            },
          ]}
        />
      </ConsoleSection>

      <ConsoleSection title={c["admin.models.lanes"]}>
        <ConsoleTable
          columns={[
            c["admin.models.provider"],
            c["console.status"],
            c["admin.models.model"],
            c["admin.models.key"],
          ]}
          empty={c["console.dash"]}
          rows={CHAT_LANES.map((l) => {
            const key = l.hasKey();
            return [
              l.key === active
                ? `${l.label} · ${c["admin.models.active"]}`
                : l.label,
              key ? c["admin.models.keySet"] : c["admin.models.keyMissing"],
              l.model(),
              mask(key),
            ];
          })}
        />
      </ConsoleSection>

      <ConsoleSection title={c["admin.models.laneEmbed"]}>
        <KeyValue
          rows={[
            { key: c["admin.models.endpoint"], value: env.embeddingBaseUrl() },
            { key: c["admin.models.model"], value: env.embeddingModel() },
            { key: c["admin.models.dimensions"], value: String(env.embeddingDimensions()) },
            {
              key: c["admin.models.key"],
              value: env.embeddingApiKey() ? c["admin.models.keySet"] : c["admin.models.keyMissing"],
            },
          ]}
        />
      </ConsoleSection>

      <ConsoleSection title={c["admin.models.laneModeration"]}>
        <KeyValue
          rows={[
            {
              key: c["admin.models.channel"],
              value: waffoSiftEnabled()
                ? "Waffo Prompt Sift (RSA-signed)"
                : moderationConfigured()
                  ? "Creem Moderation API"
                  : c["admin.models.channelLocal"],
            },
            {
              key: c["admin.models.failMode"],
              value: c["admin.models.failClosed"],
            },
          ]}
        />
      </ConsoleSection>

      <ConsoleSection title={c["admin.models.laneStudio"]}>
        <KeyValue
          rows={[
            {
              key: c["admin.models.provider"],
              value: falKey
                ? `fal.run · ${c["admin.models.keySet"]}`
                : c["admin.models.keyMissing"],
            },
            { key: c["admin.models.model"], value: falModel },
            {
              key: c["admin.models.surfaced"],
              value:
                env.showVideoStudio() && env.showAiSurfaces()
                  ? c["admin.models.on"]
                  : c["admin.models.off"],
            },
          ]}
        />
      </ConsoleSection>

      <Notice>{c["admin.models.note"]}</Notice>
    </div>
  );
}
