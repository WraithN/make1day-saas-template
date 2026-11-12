import { getLang } from "@/lib/i18n-server";
import { consoleCopy } from "@/lib/content/console";
import { env } from "@/lib/env";
import { allPrices, allRouting, ledger, type Lane } from "@/lib/billing";
import {
  ModelConsole,
  type LaneMeta,
  type PriceValue,
  type ProviderInfo,
  type RoutingValue,
} from "@/components/console/ModelConsole";
import { Notice } from "@/components/console/ConsoleUI";

export const dynamic = "force-dynamic";

// Provider catalog for the chat lane. Deliberately NOT importing
// lib/ai/providers or lib/video/*: those files are pruned from builds that do
// not select the AI/video modules, while this page ships with every admin
// build. The getters below are all from lib/env.ts, which is core.
const CHAT_PROVIDERS: { key: string; label: string; hasKey: () => boolean; model: () => string }[] = [
  { key: "openai", label: "OpenAI", hasKey: () => !!env.openaiApiKey(), model: () => env.openaiModel() },
  { key: "anthropic", label: "Anthropic", hasKey: () => !!env.anthropicApiKey(), model: () => env.anthropicModel() },
  { key: "gemini", label: "Google Gemini", hasKey: () => !!env.geminiApiKey(), model: () => env.geminiModel() },
  { key: "openrouter", label: "OpenRouter", hasKey: () => !!env.openrouterApiKey(), model: () => env.openrouterModel() },
  { key: "deepseek", label: "DeepSeek", hasKey: () => !!env.deepseekApiKey(), model: () => env.deepseekModel() },
  { key: "groq", label: "Groq", hasKey: () => !!env.groqApiKey(), model: () => env.groqModel() },
  { key: "mistral", label: "Mistral", hasKey: () => !!env.mistralApiKey(), model: () => env.mistralModel() },
  { key: "cohere", label: "Cohere", hasKey: () => !!env.cohereApiKey(), model: () => env.cohereModel() },
  { key: "xai", label: "xAI Grok", hasKey: () => !!env.xaiApiKey(), model: () => env.xaiModel() },
  { key: "perplexity", label: "Perplexity", hasKey: () => !!env.perplexityApiKey(), model: () => env.perplexityModel() },
  { key: "ollama", label: "Ollama (self-hosted)", hasKey: () => true, model: () => env.ollamaModel() },
];

export default async function AdminModelsPage() {
  const lang = await getLang();
  const c = consoleCopy(lang);
  const routing = await allRouting();
  const prices = await allPrices();
  const rows = await ledger(30);
  const totalUsd = rows.reduce((s, r) => s + r.costUsd, 0);

  const activeChat = CHAT_PROVIDERS.find((p) => p.key === env.aiProvider()) ?? CHAT_PROVIDERS[0];
  const falModel = (process.env.VIDEO_FAL_MODEL ?? "").trim() || "fal-ai/face-swap/video";
  const falHas = !!(process.env.FAL_KEY ?? "").trim();

  const lanes: LaneMeta[] = [
    {
      lane: "chat",
      title: c["admin.models.laneChat"],
      wired: true,
      envDefault: `${env.aiProvider()} · ${activeChat.model()}`,
      providerOptions: CHAT_PROVIDERS.map<ProviderInfo>((p) => ({
        key: p.key,
        label: p.label,
        hasKey: p.hasKey(),
        model: p.model(),
      })),
      allowFallback: true,
      priceMode: "tokens",
    },
    {
      lane: "embed",
      title: c["admin.models.laneEmbed"],
      wired: env.embeddingApiKey() !== "",
      envDefault: `${env.embeddingModel()} @ ${safeHost(env.embeddingBaseUrl())}`,
      providerOptions: [],
      allowFallback: false,
      priceMode: "tokens",
    },
    {
      lane: "video",
      title: c["admin.models.laneVideo"],
      wired: falHas,
      envDefault: `fal.run · ${falModel}`,
      providerOptions: [{ key: "fal", label: "fal.run", hasKey: falHas, model: falModel }],
      allowFallback: false,
      priceMode: "unit",
    },
    {
      lane: "image",
      title: c["admin.models.laneImage"],
      wired: false,
      envDefault: "fal.run · flux",
      providerOptions: [{ key: "fal", label: "fal.run", hasKey: falHas, model: "flux" }],
      allowFallback: false,
      priceMode: "unit",
    },
    {
      lane: "voice",
      title: c["admin.models.laneVoice"],
      wired: false,
      envDefault: "edge-tts",
      providerOptions: [
        { key: "edge-tts", label: "edge-tts (free)", hasKey: true, model: "edge-tts" },
        { key: "elevenlabs", label: "ElevenLabs", hasKey: false, model: "eleven-multilingual-v2" },
      ],
      allowFallback: false,
      priceMode: "unit",
    },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <ModelConsole
        copy={c as unknown as Record<string, string>}
        lanes={lanes}
        routing={routing as Record<string, RoutingValue | null>}
        prices={prices as Record<string, PriceValue>}
        ledgerRows={rows}
        totalUsd={Math.round(totalUsd * 1e4) / 1e4}
      />
      <Notice>{c["admin.models.note"]}</Notice>
    </div>
  );
}

function safeHost(u: string): string {
  try {
    return new URL(u).host;
  } catch {
    return u;
  }
}
