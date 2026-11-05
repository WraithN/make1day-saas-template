#!/usr/bin/env node
/**
 * stdio <-> HTTP bridge for ShipKit's MCP endpoint.
 *
 * Cursor and Claude Code speak JSON-RPC over stdio; the ShipKit site exposes
 * the same protocol over HTTP at /api/mcp. This bridge only forwards lines,
 * so tool definitions and the license gate stay on the server.
 *
 *   SHIPKIT_MCP_URL=https://shipkit.dev node scripts/mcp-server.mjs
 *
 * Cursor (~/.cursor/mcp.json):
 *   { "mcpServers": { "shipkit": {
 *       "command": "node",
 *       "args": ["<abs path>/scripts/mcp-server.mjs"],
 *       "env": { "SHIPKIT_MCP_URL": "https://shipkit.dev" }
 *   } } }
 *
 * Claude Code:
 *   claude mcp add shipkit -- node <abs path>/scripts/mcp-server.mjs
 *
 * stdout carries JSON-RPC only; diagnostics go to stderr.
 */
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import path from "node:path";

const BASE = (process.env.SHIPKIT_MCP_URL ?? "http://127.0.0.1:3000").replace(/\/+$/, "");
const ENDPOINT = `${BASE}/api/mcp`;
const HERE = path.dirname(fileURLToPath(import.meta.url));

console.error(`[shipkit-mcp] forwarding to ${ENDPOINT} (bridge: ${HERE})`);

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

const reply = (id, code, message) =>
  process.stdout.write(
    JSON.stringify({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }) + "\n",
  );

rl.on("line", async (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    reply(null, -32700, "Parse error");
    return;
  }
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    });
    if (res.status === 204) return; // notification
    const text = await res.text();
    // Pass through verbatim so protocolVersion / ids stay untouched.
    process.stdout.write(text.replace(/\s+$/, "") + "\n");
  } catch (err) {
    console.error(`[shipkit-mcp] ${err.message}`);
    reply(msg?.id, -32603, `Upstream unavailable: ${err.message}`);
  }
});

rl.on("close", () => process.exit(0));
