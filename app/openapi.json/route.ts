// OpenAPI 3.1 contract for ShipKit's public HTTP surface.
// Self-contained: no project imports, so pruning can exclude this route from
// generated customer ZIPs without breaking their type-check.
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://shipkit.dev").replace(
  /\/+$/,
  "",
);

export const dynamic = "force-dynamic";

// The numeric argument documents the HTTP status at the call site; the
// responses object is keyed by it, so only description/content are emitted.
const json = (_status: number, description: string, schema?: object) => ({
  description,
  ...(schema
    ? { content: { "application/json": { schema } } }
    : {}),
});

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const err = (description: string) => json(0, description, ref("Error"));

export function GET() {
  const doc = {
    openapi: "3.1.0",
    info: {
      title: "ShipKit API",
      version: "1.0.0",
      summary: "Configurable Next.js SaaS starter generator, licensing and payments",
      description:
        "ShipKit sells a configurable Next.js 15 SaaS starter. The Builder posts a selection to /api/generate and receives a pruned, buildable, agent-native ZIP containing AGENTS.md, design.md, scoped rules, Cursor rules, CLAUDE.md and up to 12 skills. An MCP endpoint lets coding agents assemble a valid configuration programmatically. Source downloads are gated by an offline license key or an active subscription / email claim — the source ZIP is the product, so anonymous visitors never receive it. A source-free preview package is available without a license. Full human/agent-readable overview: /llms-full.txt. Agent guide: /agent-ready. Go-live notes: docs/waffo-launch-checklist.md.",
    },
    servers: [{ url: SITE, description: "ShipKit site" }],
    tags: [
      { name: "Generator", description: "Build and download a customized project" },
      { name: "License", description: "Offline HMAC license keys" },
      { name: "Payments", description: "Waffo Pancake checkout + webhooks" },
      { name: "RAG", description: "Hybrid BM25 + embeddings retrieval" },
      { name: "AI", description: "Multi-provider chat" },
      { name: "Analytics", description: "First-party, consent-gated statistics" },
      {
        name: "MCP",
        description: "Model Context Protocol tools for agent-driven scaffolding",
      },
    ],
    paths: {
      "/api/generate": {
        post: {
          tags: ["Generator"],
          summary: "Generate and download a customized Next.js project ZIP",
          description:
            "Requires an entitlement. Order: offline license key (body or sk_license cookie) -> active subscription / email auto-claim -> 402. The gate protects this site only; generated projects ship with LICENSE_GATE=off.",
          security: [
            { licenseCookie: [] },
            { supabaseSession: [] },
            {},
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    ref("BuilderConfig"),
                    {
                      type: "object",
                      properties: {
                        licenseKey: {
                          type: "string",
                          maxLength: 4096,
                          description: "Optional SK1.<payload>.<mac> offline license key",
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Generated project archive",
              headers: {
                "Content-Disposition": {
                  description: 'attachment; filename="<slug>-shipkit.zip"',
                  schema: { type: "string" },
                },
                "X-ShipKit-Entitlement": {
                  description: "Which rule allowed the download (never the key itself)",
                  schema: { type: "string" },
                },
              },
              content: { "application/zip": { schema: { type: "string", format: "binary" } } },
            },
            "400": err("Invalid BuilderConfig"),
            "402": json(402, "No entitlement", ref("PaymentRequired")),
            "500": err("Packaging failed"),
          },
        },
      },
      "/api/generate/preview": {
        post: {
          tags: ["Generator"],
          summary: "Download a source-free preview of the configured build",
          description:
            "Anonymous visitors may download a preview package that contains the FILE INVENTORY of the configured build plus the design tokens — never application source. The quota is counted per signed visitor token and per trusted network.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: ref("BuilderConfig"),
              },
            },
          },
          responses: {
            "200": {
              description: "Preview package archive",
              headers: {
                "Content-Disposition": {
                  description: 'attachment; filename="<slug>-shipkit-preview.zip"',
                  schema: { type: "string" },
                },
                "X-ShipKit-Entitlement": {
                  description: "Which rule allowed the preview (never the token itself)",
                  schema: { type: "string" },
                },
              },
              content: { "application/zip": { schema: { type: "string", format: "binary" } } },
            },
            "400": err("Invalid BuilderConfig"),
            "402": json(402, "Preview limit reached", ref("PaymentRequired")),
            "500": err("Preview packaging failed"),
          },
        },
      },
      "/api/license": {
        post: {
          tags: ["License"],
          summary: "Redeem a license key into an httpOnly cookie",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["licenseKey"],
                  properties: { licenseKey: { type: "string" } },
                },
              },
            },
          },
          responses: {
            "200": json(200, "Key redeemed", ref("LicenseRedeemResponse")),
            "400": err("Missing or invalid license key"),
          },
        },
        get: {
          tags: ["License"],
          summary: "Current gate + redeemed key status",
          responses: { "200": json(200, "Status", ref("LicenseStatus")) },
        },
        delete: {
          tags: ["License"],
          summary: "Clear the sk_license cookie",
          responses: { "200": json(200, "Cleared", { type: "object", properties: { ok: { type: "boolean" } } }) },
        },
      },
      "/api/checkout": {
        post: {
          tags: ["Payments"],
          summary: "Create a Waffo Pancake checkout session",
          description:
            "Requires a Supabase-authenticated user. Buyout is a one-time product, Care is a monthly subscription.",
          security: [{ supabaseSession: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["plan"],
                  properties: {
                    plan: { type: "string", enum: ["buyout", "care"] },
                  },
                },
              },
            },
          },
          responses: {
            "200": json(200, "Checkout URL", ref("CheckoutResponse")),
            "400": err("Invalid plan"),
            "401": err("Not authenticated"),
            "500": err("Gateway error"),
            "502": err("Gateway returned no checkout URL"),
          },
        },
      },
      "/api/webhook": {
        post: {
          tags: ["Payments"],
          summary: "Single webhook endpoint for every payment provider",
          description:
            "Pancake: X-Waffo-Signature: t=<ms>,v1=<base64>; RSA-SHA256 over the raw body prefixed by the timestamp and a dot, verified with the platform Webhook Public Key (test/prod). Events are deduplicated on eventType+eventId; successful paid events issue an offline license key. Verification failures return 400; persistence failures return 500 so the gateway retries.",
          security: [{ waffoSignature: [] }],
          parameters: [
            {
              name: "X-Waffo-Signature",
              in: "header",
              required: false,
              description: "Pancake signature header",
              schema: { type: "string" },
            },
            {
              name: "X-Waffo-Event",
              in: "header",
              required: false,
              description: "Pancake event type (also present in the payload)",
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { type: "object", additionalProperties: true },
              },
            },
          },
          responses: {
            "200": json(200, "Verified and processed (Pancake: {received:true}; Acquiring: {message:success})", {
              type: "object",
              additionalProperties: true,
            }),
            "400": err("Signature verification failed"),
            "500": err("Persistence failed — retry"),
          },
        },
      },
      "/api/payments/self-check": {
        get: {
          tags: ["Payments"],
          summary: "Read-only integration readiness (never returns secrets)",
          responses: { "200": json(200, "Configuration state", ref("SelfCheck")) },
        },
      },
      "/api/rag/ingest": {
        post: {
          tags: ["RAG"],
          summary: "Chunk, embed and index a document",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title", "text"],
                  properties: {
                    title: { type: "string", maxLength: 200 },
                    text: { type: "string", maxLength: 200000 },
                  },
                },
              },
            },
          },
          responses: {
            "200": json(200, "Indexed", ref("RagIngestResponse")),
            "400": err("Missing title or text"),
          },
        },
        get: {
          tags: ["RAG"],
          summary: "List indexed documents",
          responses: {
            "200": json(200, "Documents", { type: "object", properties: { documents: { type: "array", items: { type: "object" } } } }),
          },
        },
      },
      "/api/rag/query": {
        post: {
          tags: ["RAG"],
          summary: "Hybrid retrieval (BM25 + embeddings, RRF) with cited answer",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["question"],
                  properties: {
                    question: { type: "string", maxLength: 1000 },
                    provider: { type: "string", maxLength: 60 },
                  },
                },
              },
            },
          },
          responses: {
            "200": json(200, "Answer with citations", ref("RagQueryResponse")),
            "400": err("Missing question"),
            "500": err("Retrieval failed"),
          },
        },
      },
      "/api/ai": {
        post: {
          tags: ["AI"],
          summary: "Multi-provider chat (plan-gated outside demo mode)",
          security: [{ supabaseSession: [] }, {}],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["message"],
                  properties: { message: { type: "string", maxLength: 2000 } },
                },
              },
            },
          },
          responses: {
            "200": { description: "Text/event-stream style response body" },
            "400": err("Invalid message"),
            "401": err("Unauthorized"),
            "402": err("Subscription required"),
          },
        },
      },
      "/api/track": {
        post: {
          tags: ["Analytics"],
          summary: "Aggregate pageview (only after cookie consent)",
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { path: { type: "string", maxLength: 200 } },
                },
              },
            },
          },
          responses: { "200": json(200, "Recorded", { type: "object", properties: { ok: { type: "boolean" } } }) },
        },
      },
      "/api/stats": {
        get: {
          tags: ["Analytics"],
          summary: "First-party aggregate stats",
          description: "Requires an operator session (sign in at /admin) when configured.",
          security: [{ adminBasic: [] }, {}],
          responses: {
            "200": json(200, "Aggregates", { type: "object", additionalProperties: true }),
            "401": err("Unauthorized"),
          },
        },
      },
      "/api/mcp": {
        post: {
          tags: ["MCP"],
          summary: "MCP JSON-RPC 2.0 endpoint (initialize / tools/list / tools/call)",
          description:
            "Stateless Model Context Protocol over HTTP. Tools: get_product_info, get_builder_config, scaffold_project, get_agent_delivery. scaffold_project returns a validated BuilderConfig plus the exact POST body for /api/generate; includeZip=true returns the ZIP as base64 and is subject to the SAME license gate. Notifications (requests without id) receive HTTP 204. Reference: docs/mcp.md.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["jsonrpc", "method"],
                  properties: {
                    jsonrpc: { type: "string", enum: ["2.0"] },
                    id: { type: ["string", "number", "null"] },
                    method: {
                      type: "string",
                      enum: ["initialize", "ping", "tools/list", "tools/call", "resources/list"],
                    },
                    params: { type: "object", additionalProperties: true },
                  },
                },
              },
            },
          },
          responses: {
            "200": json(200, "JSON-RPC 2.0 result", {
              type: "object",
              properties: {
                jsonrpc: { type: "string", enum: ["2.0"] },
                id: { type: ["string", "number", "null"] },
                result: { type: "object", additionalProperties: true },
                error: {
                  type: "object",
                  properties: {
                    code: { type: "integer" },
                    message: { type: "string" },
                    data: { type: "object", additionalProperties: true },
                  },
                },
              },
            }),
            "204": { description: "Notification accepted (no response body)" },
            "400": err("Invalid JSON-RPC request"),
            "500": err("Internal tool error"),
          },
        },
        get: {
          tags: ["MCP"],
          summary: "Service and tool discovery (human/agent friendly)",
          responses: {
            "200": json(200, "Server info + tool list", {
              type: "object",
              properties: {
                name: { type: "string" },
                protocolVersion: { type: "string" },
                tools: { type: "array", items: { type: "object", additionalProperties: true } },
              },
            }),
          },
        },
      },
    },
    components: {
      securitySchemes: {
        licenseCookie: {
          type: "apiKey",
          in: "cookie",
          name: "sk_license",
          description: "httpOnly cookie set by POST /api/license",
        },
        supabaseSession: {
          type: "apiKey",
          in: "cookie",
          name: "sb-access-token",
          description: "Supabase auth cookie; the exact name is project-specific",
        },
        waffoSignature: {
          type: "apiKey",
          in: "header",
          name: "X-Waffo-Signature",
        },
        adminBasic: { type: "http", scheme: "basic" },
      },
      schemas: {
        BuilderConfig: {
          type: "object",
          required: ["appName", "auth", "payment", "ai", "features", "deploy", "style", "skills"],
          properties: {
            appName: { type: "string", minLength: 1, maxLength: 60 },
            auth: {
              type: "array",
              maxItems: 5,
              items: { type: "string", enum: ["email", "google", "github", "apple", "microsoft"] },
            },
            payment: { type: "string", enum: ["none", "stripe", "creem", "paypal", "waffo"] },
            ai: {
              type: "array",
              maxItems: 3,
              items: { type: "string", enum: ["openai", "anthropic", "gemini"] },
            },
            features: {
              type: "array",
              maxItems: 6,
              description: "account = user console (/account), admin = operator console (/admin). Both are pruned from the ZIP when unchecked.",
              items: { type: "string", enum: ["landing", "dashboard", "rag", "multitenancy", "account", "admin"] },
            },
            deploy: { type: "string", enum: ["vercel", "selfhost", "cloudflare"] },
            style: {
              type: "string",
              enum: ["midnight", "paper", "aurora", "emerald", "sunset", "ocean", "mono", "slate", "candy", "sand"],
            },
            skills: {
              type: "array",
              maxItems: 12,
              items: {
                type: "string",
                enum: [
                  "frontend", "ui", "backend", "testing", "seo", "auth",
                  "payments", "database", "rag", "i18n", "deploy", "agents",
                ],
              },
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
            code: { type: "string" },
            details: { type: "object", additionalProperties: true },
          },
        },
        PaymentRequired: {
          type: "object",
          properties: {
            error: { type: "string", const: "license_required" },
            code: { type: "string", const: "PAYMENT_REQUIRED" },
            pricingUrl: { type: "string", example: "/pricing" },
            licenseUrl: { type: "string", example: "/license" },
          },
        },
        LicenseStatus: {
          type: "object",
          properties: {
            gateEnabled: { type: "boolean" },
            redeemed: { type: "boolean" },
            plan: { type: ["string", "null"] },
            email: { type: ["string", "null"] },
            expiresAt: { type: ["string", "null"] },
          },
        },
        LicenseRedeemResponse: {
          type: "object",
          properties: {
            ok: { type: "boolean" },
            plan: { type: "string" },
            email: { type: ["string", "null"] },
            expiresAt: { type: ["string", "null"] },
          },
        },
        CheckoutResponse: {
          type: "object",
          properties: { url: { type: "string", format: "uri" } },
        },
        SelfCheck: {
          type: "object",
          properties: {
            provider: { type: "string" },
            waffo: { type: "object", additionalProperties: true },
            license: { type: "object", additionalProperties: true },
            missing: { type: "array", items: { type: "string" } },
            ready: { type: "boolean" },
          },
        },
        RagIngestResponse: {
          type: "object",
          properties: {
            document: { type: "object", additionalProperties: true },
            total: { type: "integer" },
          },
        },
        RagQueryResponse: {
          type: "object",
          properties: {
            answer: { type: "string", description: "May contain inline [n] citations" },
            citations: { type: "array", items: { type: "object", additionalProperties: true } },
            mode: { type: "string" },
            retrieval: {
              type: "object",
              description: "Which branches ran: lexical / semantic / pgvector / store / strategy",
              additionalProperties: true,
            },
          },
        },
      },
    },
  };

  return new Response(JSON.stringify(doc, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
