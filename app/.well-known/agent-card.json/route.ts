import { NextResponse } from "next/server";

/**
 * Agent-card discovery descriptor. This is an A2A-style capability document
 * describing the machine-readable surfaces this site actually exposes.
 *
 * Honesty matters more than a long capability list: there is no A2A task
 * endpoint, no streaming transport and no push notifications. The MCP
 * endpoint is stateless JSON-RPC over POST; the scaffold_project tool is
 * gated exactly like the browser download.
 *
 * Site-only: pruned from every customer ZIP (lib/generator/prune.ts).
 */
export const dynamic = "force-static";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://make1day.com";

export function GET() {
  return NextResponse.json(
    {
      name: "make1day",
      description:
        "Configurable AI SaaS starter: pick a stack, receive a pruned, white-label source ZIP. Machine-readable docs and a gated scaffolding tool for coding agents.",
      url: SITE_URL,
      version: "1.0.0",
      protocolVersion: "0.3.0",
      provider: {
        organization: "make1day",
        url: SITE_URL,
      },
      documentationUrl: `${SITE_URL}/llms-full.txt`,
      capabilities: {
        streaming: false,
        pushNotifications: false,
        stateTransitionHistory: false,
      },
      securitySchemes: {
        licenseKey: {
          type: "apiKey",
          in: "header",
          name: "x-shipkit-license",
          description:
            "Offline HMAC license key. Required for full source generation; a free source-free preview needs no key.",
        },
      },
      defaultInputModes: ["text/plain", "application/json"],
      defaultOutputModes: ["text/plain", "application/json", "application/zip"],
      skills: [
        {
          id: "read_machine_docs",
          name: "Read machine-readable product docs",
          description:
            "Fetch llms.txt / llms-full.txt / OpenAPI 3.1 to learn the real feature set, pricing and known limits.",
          tags: ["docs", "geo", "discovery"],
          examples: ["GET /llms.txt", "GET /openapi.json"],
        },
        {
          id: "scaffold_project",
          name: "Generate a configured source project",
          description:
            "POST /api/mcp with a JSON-RPC tools/call for scaffold_project, or POST /api/generate directly. Both require a paid entitlement for the full ZIP; includeZip=false returns an inventory only.",
          tags: ["generator", "scaffold", "mcp"],
          examples: ["POST /api/mcp", "POST /api/generate"],
        },
        {
          id: "read_markdown",
          name: "Read pages as Markdown",
          description:
            "Append ?format=md to a public page, or fetch /blog/<slug>/md, to get a plain-text representation without rendering HTML.",
          tags: ["markdown", "geo"],
          examples: ["GET /faq?format=md", "GET /blog/ai-saas-boilerplate-checklist-2026/md"],
        },
        {
          id: "check_integrations",
          name: "Check integration readiness",
          description:
            "GET /api/payments/self-check and /api/health report configuration state and dependency readiness without exposing secret values.",
          tags: ["operations", "health"],
          examples: ["GET /api/payments/self-check", "GET /api/health"],
        },
      ],
      endpoints: {
        llms: "/llms.txt",
        llmsFull: "/llms-full.txt",
        openapi: "/openapi.json",
        mcp: "/api/mcp",
        generate: "/api/generate",
        preview: "/api/generate/preview",
        markdown: "/api/markdown",
        health: "/api/health",
      },
      limitations: [
        "No A2A task lifecycle, no SSE or streaming transport, no push notifications.",
        "MCP is stateless JSON-RPC: tools/resources only, no sampling, prompts or subscriptions.",
        "Full source ZIPs require a paid entitlement; anonymous callers receive a 402 plus a source-free preview.",
        "Local SQLite and the in-memory RAG index are not durable on serverless.",
      ],
    },
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
