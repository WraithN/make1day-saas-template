// Single zod source for BuilderConfig validation. Both /api/generate and the
// MCP scaffold_project tool read from here, so adding a new option can never
// leave one of the two endpoints with a stale enum.

import { z } from "zod";

export const builderConfigSchema = z.object({
  appName: z.string().min(1).max(60),
  auth: z
    .array(z.enum(["email", "google", "github", "apple", "microsoft"]))
    .max(5),
  payment: z
    .array(
      z.enum([
        "none",
        "stripe",
        "creem",
        "paypal",
        "waffo",
        "lemonsqueezy",
      ]),
    )
    .max(6)
    .refine(
      (arr) => !(arr.includes("none") && arr.length > 1),
      "When 'none' is selected, no other payment provider may be selected",
    ),
  ai: z
    .array(
      z.enum([
        "openai",
        "anthropic",
        "gemini",
        "mistral",
        "cohere",
        "xai",
        "perplexity",
        "ollama",
      ]),
    )
    .max(8),
  features: z
    .array(
      z.enum([
        "landing",
        "dashboard",
        "rag",
        "multitenancy",
        "account",
        "admin",
        "premium",
      ]),
    )
    .max(7),
  deploy: z.enum(["vercel", "selfhost", "cloudflare"]),
  style: z.enum([
    "doodle",
    "midnight",
    "paper",
    "aurora",
    "emerald",
    "sunset",
    "ocean",
    "mono",
    "slate",
    "candy",
    "sand",
    "y2k",
    "pixel",
    "neon",
    "glass",
    "retro",
  ]),
  skills: z
    .array(
      z.enum([
        "frontend",
        "ui",
        "backend",
        "testing",
        "seo",
        "auth",
        "payments",
        "database",
        "rag",
        "i18n",
        "deploy",
        "agents",
      ]),
    )
    .max(12),
});

export type ValidatedBuilderConfig = z.infer<typeof builderConfigSchema>;
