#!/usr/bin/env node
/**
 * Manually issue a ShipKit license key (for offline sales, comp seats, or
 * reconciling a paid order whose webhook was lost).
 *
 * Usage:
 *   LICENSE_SECRET=... node scripts/issue-license.mjs \
 *     --email buyer@example.com --plan buyout --order ORD_123
 *
 * `--plan care` issues a 35-day key unless --expires is given (ISO date).
 * The key is self-verifying; no database write happens here.
 */
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Load .env.local without adding a dependency.
try {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const envPath = path.join(here, "..", ".env.local");
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {
  /* .env.local is optional */
}

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--")) {
      const key = cur.slice(2);
      const next = arr[i + 1];
      acc.push([key, next && !next.startsWith("--") ? next : "true"]);
    }
    return acc;
  }, []),
);

const secret = process.env.LICENSE_SECRET;
if (!secret) {
  console.error("ERROR: LICENSE_SECRET is not set (env var or .env.local).");
  process.exit(1);
}
if (!args.email) {
  console.error("ERROR: --email is required so the buyer can auto-claim.");
  process.exit(1);
}
const plan = args.plan === "care" ? "care" : "buyout";
const now = Math.floor(Date.now() / 1000);
let exp;
if (args.expires) exp = Math.floor(Date.parse(args.expires) / 1000);
else if (plan === "care") exp = now + 35 * 24 * 3600;
if (exp && !Number.isFinite(exp)) {
  console.error("ERROR: --expires must be a valid ISO date.");
  process.exit(1);
}

const payload = {
  v: 1,
  jti: randomUUID(),
  email: args.email.toLowerCase(),
  plan,
  ...(args.order ? { orderId: args.order } : {}),
  iat: now,
  ...(exp ? { exp } : {}),
};
const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
const sig = createHmac("sha256", secret).update(body).digest("base64url");

console.log(`SK1.${body}.${sig}`);
console.error(
  `\nIssued ${plan} key for ${args.email}${exp ? ` (expires ${new Date(exp * 1000).toISOString()})` : " (lifetime)"}.\nSend the SK1.… line above to the buyer.`,
);
