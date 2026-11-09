#!/usr/bin/env node
// Apply supabase/migrations/*.sql to the linked project through the Supabase
// MCP server (https://mcp.supabase.com/mcp).
//
// Why MCP instead of `supabase db push`: the project's direct Postgres host
// is IPv6-only while GitHub-hosted runners (and many networks) are IPv4-only,
// and the IPv4 pooler tenant may be unavailable. The MCP endpoint is
// IPv4-friendly, authenticated with the same SUPABASE_ACCESS_TOKEN, and its
// `apply_migration` tool records history in supabase_migrations just like the
// CLI — so this script and `supabase db push` stay idempotent with each other.
//
// Env:
//   SUPABASE_ACCESS_TOKEN  personal access token (needs Migrations read-write)
//   SUPABASE_PROJECT_REF   project ref, e.g. abcdefghijklmnopqrst
//   SUPABASE_MCP_URL       optional override of the MCP endpoint
//
// Usage: node scripts/supabase-migrate-mcp.mjs

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const PROJECT = process.env.SUPABASE_PROJECT_REF?.trim();
const MCP_URL =
  process.env.SUPABASE_MCP_URL?.trim() || "https://mcp.supabase.com/mcp";

if (!TOKEN || !PROJECT) {
  console.error(
    "SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF are required",
  );
  process.exit(2);
}

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = path.join(root, "supabase", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
if (files.length === 0) {
  console.log("no migration files found");
  process.exit(0);
}

let sessionId;
let rpcId = 0;

async function rpc(method, params, expectsResponse = true) {
  const body = JSON.stringify(
    expectsResponse
      ? { jsonrpc: "2.0", id: ++rpcId, method, params }
      : { jsonrpc: "2.0", method, params },
  );
  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (sessionId) headers["mcp-session-id"] = sessionId;
  const res = await fetch(MCP_URL, { method: "POST", headers, body });
  const sid = res.headers.get("mcp-session-id");
  if (sid) sessionId = sid;
  if (!expectsResponse) {
    if (!res.ok) throw new Error(`${method} failed: HTTP ${res.status}`);
    return null;
  }
  const ct = res.headers.get("content-type") ?? "";
  let payload;
  if (ct.includes("text/event-stream")) {
    const text = await res.text();
    const dataLines = text
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.replace(/^data:\s*/, ""));
    payload = JSON.parse(dataLines[dataLines.length - 1]);
  } else {
    payload = await res.json();
  }
  if (payload.error) {
    throw new Error(
      `${method}: ${payload.error.message ?? JSON.stringify(payload.error)}`,
    );
  }
  return payload.result;
}

function toolText(result) {
  return (result?.content ?? [])
    .map((c) => (typeof c.text === "string" ? c.text : JSON.stringify(c)))
    .join("\n");
}

await rpc("initialize", {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "make1day-migrate", version: "1.0" },
});
await rpc("notifications/initialized", {}, false);

// Which migrations are already recorded on the project? Names in
// supabase_migrations match the file stem (e.g. 0001_init).
const applied = new Set();
try {
  const listed = await rpc("tools/call", {
    name: "list_migrations",
    arguments: { project_id: PROJECT },
  });
  const text = toolText(listed);
  for (const f of files) {
    const stem = f.replace(/\.sql$/, "");
    if (text.includes(stem)) applied.add(stem);
  }
} catch (err) {
  console.log(`list_migrations unavailable (${err.message}); applying all`);
}

let count = 0;
for (const file of files) {
  const stem = file.replace(/\.sql$/, "");
  if (applied.has(stem)) {
    console.log(`skip (already applied): ${stem}`);
    continue;
  }
  const query = readFileSync(path.join(dir, file), "utf8");
  const result = await rpc("tools/call", {
    name: "apply_migration",
    arguments: { project_id: PROJECT, name: stem, query },
  });
  const out = toolText(result);
  if (result?.isError) {
    console.error(`FAILED ${stem}:\n${out}`);
    process.exit(1);
  }
  console.log(`applied: ${stem}`);
  count++;
}

console.log(
  count > 0
    ? `done: ${count} migration(s) applied`
    : "database already up to date",
);
