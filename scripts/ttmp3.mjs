import { spawn } from "node:child_process";
const env = {
  ...process.env,
  NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3127",
  LICENSE_GATE: "off",
  NEXT_PUBLIC_ENABLE_DEMO: "true",
  DEMO_IN_PRODUCTION: "true",
  PAYMENT_PROVIDER: "waffo",
};
const app = spawn("cmd", ["/c", "npx next start -p 3127"], { env, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 8000));

// 1) raw fetch (what the earlier probe did)
const raw = await (await fetch("http://127.0.0.1:3127/login", { signal: AbortSignal.timeout(20000) })).text();
console.log("RAW: len", raw.length, "| demo:", raw.includes("demo@example.com"), "| '体验账号':", raw.includes("体验账号"));

// 2) same server, env of child as seen by process manager: verify by checking an env-sensitive page: self-check
const sc = await (await fetch("http://127.0.0.1:3127/api/payments/self-check")).text();
console.log("SELF-CHECK:", sc.slice(0, 200));

// 3) browser-rendered check on the SAME server instance
const { chromium } = await import("@playwright/test");
const b = await chromium.launch({ channel: "msedge" });
const page = await b.newPage();
await page.goto("http://127.0.0.1:3127/login");
const demoBtn = await page.getByRole("button", { name: /demo@example\.com/ }).count();
console.log("BROWSER demo button count:", demoBtn);
const html2 = await page.content();
console.log("BROWSER html demo substring:", html2.includes("demo@example.com"));
await b.close();

app.kill();
setTimeout(() => process.exit(0), 400);
