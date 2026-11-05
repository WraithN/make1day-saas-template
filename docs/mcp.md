# ShipKit MCP server (`scaffold_project`)

`POST /api/mcp` speaks **JSON-RPC 2.0 / MCP** over HTTP. A coding agent can
discover honest product facts, read the Builder's valid enums and assemble a
scaffold configuration without scraping marketing pages. `scripts/mcp-server.mjs`
bridges stdio clients (Cursor / Claude Code) to the same endpoint.

## Why this exists

`llms.txt` / `llms-full.txt` are **read** by answer engines; `openapi.json`
describes the HTTP contract; MCP lets an agent **act** — compose a validated
`BuilderConfig` and receive the exact request that downloads the ZIP. It is the
executable layer of the agent-discovery stack described in
`docs/agent-discovery.md`.

## Tools

| Tool | Input | Returns |
| --- | --- | --- |
| `get_product_info` | none | Pricing, stack, real differentiators **and known limitations** |
| `get_builder_config` | none | `DEFAULT_CONFIG` + every allowed enum, plus honest notes on placeholder options |
| `scaffold_project` | `{ config?, includeZip?, licenseKey? }` | Validated config, the exact `POST /api/generate` body, gate status; optionally the ZIP as base64 |
| `get_agent_delivery` | none | The agent-native files inside every ZIP and how to regenerate them |

`resources/list` returns `llms.txt`, `llms-full.txt` and `openapi.json` as URIs.

## HTTP example

```bash
curl -s -X POST https://<domain>/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

curl -s -X POST https://<domain>/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"scaffold_project","arguments":{"config":{"style":"candy","payment":"stripe","skills":["frontend","ui","agents"]}}}}'
```

The response `content[0].text` is JSON containing `config`, `generate`, and
`licenseGate`. Feed `generate.body` straight to `POST /api/generate`.

## stdio bridge

```json
// ~/.cursor/mcp.json
{
  "mcpServers": {
    "shipkit": {
      "command": "node",
      "args": ["C:/path/to/shipkit/scripts/mcp-server.mjs"],
      "env": { "SHIPKIT_MCP_URL": "https://shipkit.dev" }
    }
  }
}
```

```bash
# Claude Code
claude mcp add shipkit -- node C:/path/to/shipkit/scripts/mcp-server.mjs
# SHIPKIT_MCP_URL defaults to http://127.0.0.1:3000
```

`stdout` carries JSON-RPC only; diagnostics go to `stderr`. The bridge forwards
lines verbatim — tool definitions and the license gate stay server-side.

## License gate

`scaffold_project` with `includeZip: false` (default) returns configuration
only and is always free — it is the discovery path. With `includeZip: true` the
same `checkEntitlement()` used by `/api/generate` applies:

- denied → JSON-RPC result with `isError: true`, `code: -32002`,
  `PAYMENT_REQUIRED`, plus `/pricing` and `/license`;
- ZIP larger than 4 MB → `code: -32003`, use the HTTP endpoint instead;
- `licenseKey` accepts an offline `SK1.*` key.

There is no way to bypass the paywall through MCP.

## Boundaries

- This is a **stateless JSON-RPC endpoint**, not a full MCP server with
  subscriptions, sampling, prompts or SSE streaming. `initialize`, `ping`,
  `tools/list`, `tools/call` and `resources/list` are implemented.
- `get_product_info` intentionally lists limitations — do not "optimise" them
  away to make the tool look better.
- Tool enums come from `lib/generator/schema.ts`, shared with `/api/generate`.
  Adding an option requires updating that schema, `config.ts`, `prune.ts` and
  `verify-matrix.mjs`.
