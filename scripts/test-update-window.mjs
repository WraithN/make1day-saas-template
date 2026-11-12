// End-to-end test of the Buyout 12-month update-window enforcement.
// Forges HMAC-signed SK1 keys (same algorithm as lib/license.ts) and POSTs
// them to the running make1day dev server at http://localhost:3000.
import crypto from "node:crypto";
import fs from "node:fs";

const env = fs.readFileSync(".env.local", "utf8");
const secret = env
  .split("\n")
  .find((l) => l.startsWith("LICENSE_SECRET="))
  ?.split("=")
  .slice(1)
  .join("=")
  .trim();
if (!secret) {
  console.error("LICENSE_SECRET not found in .env.local");
  process.exit(1);
}

function makeKey({ plan = "buyout", updatesUntilSec = null, email = "tester@example.com" }) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    v: 1,
    jti: crypto.randomUUID(),
    email,
    plan,
    iat: now,
    ...(updatesUntilSec ? { updatesUntil: updatesUntilSec } : {}),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64url");
  return `SK1.${body}.${sig}`;
}

function post(key) {
  return fetch("http://localhost:3000/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      appName: "Test App",
      auth: [],
      payment: ["none"],
      ai: [],
      features: [],
      deploy: "selfhost",
      style: "doodle",
      skills: [],
      licenseKey: key,
    }),
  }).then(async (r) => {
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { status: r.status, json };
  });
}

const now = Math.floor(Date.now() / 1000);
const cases = [
  {
    name: "expired window (updatesUntil in past)",
    key: makeKey({ updatesUntilSec: now - 86400 }),
    expectStatus: 402,
    expectCode: "UPDATES_EXPIRED",
  },
  {
    name: "valid window (updatesUntil in future)",
    key: makeKey({ updatesUntilSec: now + 86400 * 10 }),
    expectStatus: null, // anything except 402 UPDATES_EXPIRED is fine here
    expectCode: null,
  },
  {
    name: "legacy key (no updatesUntil -> grandfathered)",
    key: makeKey({ updatesUntilSec: null }),
    expectStatus: null,
    expectCode: null,
  },
  {
    name: "care key alone (no Buyout source entitlement)",
    key: makeKey({ plan: "care" }),
    expectStatus: 402,
    expectCode: "CARE_NEEDS_BUYOUT",
  },
  {
    name: "bogus key (invalid signature)",
    key: "SK1.eyJ2IjoxfQ.invalidsig",
    expectStatus: 402,
    expectCode: "PAYMENT_REQUIRED",
  },
];

let pass = 0;
let fail = 0;
for (const c of cases) {
  const res = await post(c.key);
  const code = res.json?.code;
  let ok = true;
  let detail = `status=${res.status} code=${code}`;
  if (c.expectStatus !== null && res.status !== c.expectStatus) ok = false;
  if (c.expectCode !== null && code !== c.expectCode) ok = false;
  // The two "allowed" cases must NOT be denied with UPDATES_EXPIRED.
  if (c.expectCode === null && code === "UPDATES_EXPIRED") ok = false;
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"} · ${c.name} · ${detail}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
