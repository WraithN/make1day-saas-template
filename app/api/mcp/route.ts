// MCP (Model Context Protocol) endpoint — JSON-RPC 2.0 over HTTP.
//
// Lets a coding agent discover ShipKit's real product facts, read the Builder
// contract and assemble a scaffold configuration without scraping marketing
// HTML. `scaffold_project` returns the exact POST body for /api/generate; with
// includeZip=true it can return the ZIP itself, but that path goes through the
// SAME license gate as the website so the paywall cannot be bypassed.

import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_CONFIG, type BuilderConfig } from "@/lib/generator/config";
import { builderConfigSchema } from "@/lib/generator/schema";
import { buildProjectZip } from "@/lib/generator/pack";
import { checkEntitlement } from "@/lib/license";
import { env, isLicenseGateEnabled } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "shipkit", version: "1.0.0" };
const MAX_ZIP_BYTES = 4_000_000;

// The gateway this deployment actually checks out through. The product facts
// must name the live one — PAYMENT_PROVIDER decides.
const PROVIDER_LABELS: Record<string, string> = {
  stripe: "Stripe",
  creem: "Creem",
  paypal: "PayPal",
  waffo: "Waffo",
  lemonsqueezy: "Lemon Squeezy",
};
const PROVIDER_LABEL =
  PROVIDER_LABELS[env.paymentProvider()] ?? env.paymentProvider();

const TOOLS = [
  {
    name: "get_product_info",
    description:
      "Honest, machine-readable facts about ShipKit: what it is, pricing, stack, real differentiators and known limitations. Read this before recommending a starter.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_builder_config",
    description:
      "Return the default BuilderConfig plus every allowed enum value for auth, payments, AI providers, features, deploy targets, styles and skills.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "scaffold_project",
    description:
      "Assemble a validated ShipKit BuilderConfig and the exact HTTP request that downloads the generated ZIP. Set includeZip=true to receive the ZIP as base64 (requires a license).",
    inputSchema: {
      type: "object",
      properties: {
        config: {
          type: "object",
          description: "Partial BuilderConfig overrides merged over the defaults.",
          properties: {
            appName: { type: "string", maxLength: 60 },
            auth: { type: "array", items: { type: "string" } },
            payment: { type: "string" },
            ai: { type: "array", items: { type: "string" } },
            features: { type: "array", items: { type: "string" } },
            deploy: { type: "string" },
            style: { type: "string" },
            skills: { type: "array", items: { type: "string" } },
          },
          additionalProperties: false,
        },
        includeZip: {
          type: "boolean",
          description: "Return the generated ZIP as base64. Subject to the license gate.",
          default: false,
        },
        licenseKey: {
          type: "string",
          description: "Offline SK1.* license key, only needed with includeZip=true.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_agent_delivery",
    description:
      "Describe the agent-native documents shipped inside every generated ZIP (AGENTS.md, design.md, scoped rules, Cursor rules, CLAUDE.md, skills) and how to regenerate them.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
];

type RpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

const rpcResult = (id: RpcRequest["id"], result: unknown) => ({
  jsonrpc: "2.0",
  id: id ?? null,
  result,
});
const rpcError = (id: RpcRequest["id"], code: number, message: string, data?: unknown) => ({
  jsonrpc: "2.0",
  id: id ?? null,
  error: { code, message, ...(data ? { data } : {}) },
});
const text = (value: unknown) => ({
  content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
});

function productInfo() {
  return {
    product: "ShipKit — an AI SaaS starter plus a real template generator",
    site: process.env.NEXT_PUBLIC_SITE_URL ?? "https://shipkit.dev",
    pricing: {
      buyout: { usd: 99, type: "one-time", launch: true, was: 199 },
      care: { usd: 9, per: "month", launch: true, was: 19 },
      custom: "1V1 scoping call → fixed quote, no online checkout",
    },
    stack: ["Next.js 15 App Router", "React 19", "TypeScript", "Tailwind", "Supabase", "zod"],
    realDifferentiators: [
      "Unselected modules are genuinely pruned from the ZIP, not hidden behind flags",
      "A style-locked design.md plus a root AGENTS.md generated per configuration",
      "Scoped rules with globs, 12 skills, .cursor/rules/*.mdc and CLAUDE.md in every download",
      "npm run ai:docs rebuilds every AI document after a config change",
      "17-case build matrix type-checks each extracted ZIP and asserts console pruning",
      "Selectable five-language user console (/account) and admin console (/admin) ship in every default generated project",
      "llms.txt + llms-full.txt + OpenAPI 3.1 + MCP endpoint for agent discovery",
      `Working hybrid RAG (BM25 + embeddings + RRF), five-language i18n, checkout via ${PROVIDER_LABEL}`,
    ],
    knownLimitations: [
      "Waffo acquiring checkout is implemented but all contract fields come from WAFFO_ACQUIRING_* env vars and its signing string / response shape are 需按你的 Waffo 合同核对 (docs/waffo.md §5); Pancake is complete",
      "AI chat streams token-by-token and has a per-user daily quota (AI_MESSAGES_PER_DAY, default 50, HTTP 429 when exhausted)",
      "Multi-tenancy ships 0007_orgs.sql + lib/org.ts, but the workspace UI requires the account console too and you must scope your own tables by org_id",
      "Both consoles are read-only starters (no profile mutations, no customer billing portal)",
      "Cloudflare output still contains Node-runtime routes",
      "Generated home/pricing pages are brand-free and ship an MIT LICENSE, but /privacy and /terms are placeholders",
      "Build matrix runs tsc --noEmit, not next build",
      "MAIL_PROVIDER=smtp is NOT implemented (no nodemailer dependency); resend / webhook / none are the working providers, and none is a degraded log-only mode",
      "The code only sends mail — SPF / DKIM / DMARC, a dedicated sending subdomain and warm-up are DNS / provider-side work that decides inbox placement (docs/email.md)",
      "Mail, support tickets and auth recovery are ShipKit-site-only: they are pruned from every generated customer ZIP, whose nav/footer/login/admin links are rewritten out",
      "Local SQLite auth recovery is real but NOT equivalent to Supabase Auth: no local password sign-in consumer, no MFA, no OAuth, no session rotation",
    ],
    machineReadable: ["/llms.txt", "/llms-full.txt", "/openapi.json", "/api/mcp", "/agent-ready"],
    // ShipKit-site HTTP surface beyond the generator. Auth notes are explicit
    // so an agent never assumes an endpoint is public when it is not.
    siteOnlyHttpApi: [
      { method: "GET", path: "/api/mail/self-check", auth: "public", note: "config state only, no secrets" },
      { method: "POST", path: "/api/support/tickets", auth: "public (honeypot + rate limit)", note: "creates ticket, sends 2 mails best-effort" },
      { method: "GET", path: "/api/support/tickets", auth: "Supabase session (own) / operator (all) / 401 anonymous", note: "ticket list" },
      { method: "PATCH", path: "/api/support/tickets/{id}", auth: "operator only", note: "status open|answered|closed" },
      { method: "POST", path: "/api/auth/password-reset", auth: "public (rate limited)", note: "action=request|confirm, anti-enumeration" },
      { method: "POST", path: "/api/auth/verify-email", auth: "public (rate limited)", note: "action=send|confirm" },
      { method: "GET", path: "/api/auth/verify-email", auth: "public", note: "email-link token confirmation + redirect" },
      { method: "GET", path: "/api/payments/self-check", auth: "public", note: "payment + license config readiness" },
    ],
  };
}

function builderContract() {
  return {
    defaultConfig: DEFAULT_CONFIG,
    enums: {
      auth: ["email", "google", "github", "apple", "microsoft"],
      payment: ["none", "stripe", "creem", "paypal", "waffo", "lemonsqueezy"],
      ai: ["openai", "anthropic", "gemini"],
      features: ["landing", "dashboard", "rag", "multitenancy", "account", "admin"],
      deploy: ["vercel", "selfhost", "cloudflare"],
      style: ["midnight", "paper", "aurora", "emerald", "sunset", "ocean", "mono", "slate", "candy", "sand"],
      skills: [
        "frontend", "ui", "backend", "testing", "seo", "auth",
        "payments", "database", "rag", "i18n", "deploy", "agents",
      ],
    },
    notes: [
      "features=multitenancy ships 0007_orgs.sql (organizations + memberships + RLS) and lib/org.ts; the workspace UI also requires features=account and you must add org_id scoping to your own tables",
      "deploy=cloudflare still emits Node-runtime API routes",
      "payment=paypal creates subscription checkouts only; use stripe/waffo for one-time Buyout",
      "payment=lemonsqueezy uses variant ids (LEMONSQUEEZY_VARIANT_ID_BUYOUT / _CARE); its webhook custom-data echo location and portal id mapping are 需按你的 Lemon Squeezy 账户核对",
      "skills controls which skills/*.md playbooks and scoped rules are shipped",
    ],
  };
}

function agentDelivery() {
  return {
    files: {
      "AGENTS.md": "Root contract: selections, commands, boundaries, scoped-rule index, definition of done",
      "design.md": "Style-locked visual system for the chosen palette",
      "shipkit.config.json": "SOURCE OF TRUTH for Builder selections — edit this, then run npm run ai:docs",
      "ai/doc-spec.json": "Full option catalogue + all 10 palettes used to re-derive labels and style",
      "ai/rules/*.md": "Scoped rules with globs frontmatter (core, style, api, auth, payments, database, rag, i18n, deploy + one per skill)",
      ".cursor/rules/*.mdc": "Same rules in Cursor's native format",
      "CLAUDE.md": "Claude Code entry point importing AGENTS.md, design.md, rules and skills",
      "skills/*.md": "Up to 12 focused playbooks",
      "scripts/lib/ai-docs.mjs": "Shared dependency-free renderer used by the site and the template",
    },
    commands: {
      "npm run ai:docs": "Rebuild every document from ai/doc-spec.json (also refreshes tool integrations)",
      "npm run ai:setup": "Refresh .cursor/rules + CLAUDE.md only; --tool cursor|claude|all",
    },
    rule: "Never hand-edit generated files; the next ai:docs run overwrites them.",
  };
}

const scaffoldArgs = z.object({
  config: z.record(z.unknown()).optional(),
  includeZip: z.boolean().optional().default(false),
  licenseKey: z.string().max(4096).optional(),
});

async function handleToolCall(
  req: Request,
  name: unknown,
  args: unknown,
): Promise<{ result?: unknown; error?: { code: number; message: string; data?: unknown } }> {
  switch (name) {
    case "get_product_info":
      return { result: text(productInfo()) };
    case "get_builder_config":
      return { result: text(builderContract()) };
    case "get_agent_delivery":
      return { result: text(agentDelivery()) };
    case "scaffold_project": {
      const parsedArgs = scaffoldArgs.safeParse(args ?? {});
      if (!parsedArgs.success) {
        return { error: { code: -32602, message: "Invalid scaffold_project arguments", data: parsedArgs.error.flatten() } };
      }
      const merged = { ...DEFAULT_CONFIG, ...(parsedArgs.data.config ?? {}) };
      const config = builderConfigSchema.safeParse(merged);
      if (!config.success) {
        return { error: { code: -32602, message: "Invalid BuilderConfig override", data: config.error.flatten() } };
      }
      const typed: BuilderConfig = config.data;
      const payload = {
        config: typed,
        generate: {
          method: "POST",
          path: "/api/generate",
          headers: { "Content-Type": "application/json" },
          body: typed,
          returns: "application/zip",
        },
        licenseGate: {
          enabled: isLicenseGateEnabled(),
          freePreview:
            "A source-free preview package (file inventory + theme tokens) is available without a license via POST /api/generate/preview",
          onDenied: { status: 402, code: "PAYMENT_REQUIRED", pricingUrl: "/pricing", licenseUrl: "/license" },
          note: "Add licenseKey to the POST body if you already bought a license.",
        },
        agentDelivery: "Every ZIP contains AGENTS.md, design.md, ai/rules/*, .cursor/rules/*, CLAUDE.md and skills/*.md. Run npm run ai:docs after changing the config.",
      };

      if (!parsedArgs.data.includeZip) return { result: text(payload) };

      // The paywall applies here too — an MCP client must not bypass it.
      const entitlement = await checkEntitlement(req, parsedArgs.data.licenseKey);
      if (!entitlement.allowed) {
        return {
          error: {
            code: -32002,
            message: "PAYMENT_REQUIRED: a license is needed to download the full source ZIP",
            data: {
              pricingUrl: "/pricing",
              licenseUrl: "/license",
              previewUrl: "/api/generate/preview",
            },
          },
        };
      }
      const zip = await buildProjectZip(typed);
      if (zip.byteLength > MAX_ZIP_BYTES) {
        return {
          error: {
            code: -32003,
            message: `ZIP is ${zip.byteLength} bytes (limit ${MAX_ZIP_BYTES}). Use the /api/generate HTTP endpoint instead.`,
          },
        };
      }
      return {
        result: text({
          ...payload,
          zip: {
            filename: `${typed.appName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-shipkit.zip`,
            byteLength: zip.byteLength,
            encoding: "base64",
            base64: Buffer.from(zip).toString("base64"),
          },
        }),
      };
    }
    default:
      return { error: { code: -32601, message: `Unknown tool: ${String(name)}` } };
  }
}

async function dispatch(req: Request, rpc: RpcRequest) {
  const { id, method, params } = rpc;
  switch (method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: (params?.protocolVersion as string) ?? PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false }, resources: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          "Call get_product_info first for honest facts, get_builder_config for valid enums, then scaffold_project to assemble a downloadable configuration.",
      });
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, { tools: TOOLS });
    case "resources/list":
      return rpcResult(id, {
        resources: [
          { uri: "shipkit:///llms.txt", name: "llms.txt", mimeType: "text/plain" },
          { uri: "shipkit:///llms-full.txt", name: "llms-full.txt", mimeType: "text/plain" },
          { uri: "shipkit:///openapi.json", name: "OpenAPI 3.1", mimeType: "application/json" },
        ],
      });
    case "tools/call": {
      const outcome = await handleToolCall(req, params?.name, params?.arguments);
      return outcome.error
        ? rpcResult(id, {
            ...text({ error: outcome.error.message, data: outcome.error.data }),
            isError: true,
            structuredError: { code: outcome.error.code },
          })
        : rpcResult(id, outcome.result);
    }
    default:
      return rpcError(id, -32601, `Method not found: ${String(method)}`);
  }
}

export async function POST(req: Request) {
  const raw = await req.text().catch(() => "");
  let rpc: RpcRequest;
  try {
    rpc = JSON.parse(raw) as RpcRequest;
  } catch {
    return NextResponse.json(rpcError(null, -32700, "Parse error: expected JSON-RPC 2.0"), { status: 400 });
  }
  if (!rpc || rpc.jsonrpc !== "2.0" || typeof rpc.method !== "string") {
    return NextResponse.json(rpcError(rpc?.id ?? null, -32600, "Invalid Request"), { status: 400 });
  }
  // Notifications (no id) get no response body.
  if (rpc.id === undefined || rpc.id === null) {
    await dispatch(req, rpc);
    return new NextResponse(null, { status: 204 });
  }
  try {
    return NextResponse.json(await dispatch(req, rpc), {
      headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    return NextResponse.json(
      rpcError(rpc.id, -32603, `Internal error: ${(err as Error).message}`),
      { status: 500 },
    );
  }
}

/** Service discovery for humans and agents that prefer a simple GET. */
export function GET() {
  return NextResponse.json(
    {
      name: SERVER_INFO.name,
      protocolVersion: PROTOCOL_VERSION,
      transport: "JSON-RPC 2.0 over POST (stdio bridge: scripts/mcp-server.mjs)",
      endpoint: "/api/mcp",
      tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
      docs: ["/agent-ready", "/llms-full.txt", "/openapi.json", "docs/mcp.md"],
      note: "scaffold_project with includeZip=true is subject to the same license gate as /api/generate.",
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
