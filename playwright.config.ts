import { defineConfig, devices } from "@playwright/test";

/**
 * E2E over the three flows that carry the money: login, checkout, AI chat.
 *
 * Uses `next dev` (not `next start`): demo mode — the deterministic, zero-
 * config login path these tests rely on — is a DEV feature by design. In
 * production `isDemoMode()` also requires DEMO_IN_PRODUCTION, a server-only
 * env var the browser bundle can never see, so forcing demo on under
 * `next start` would make SSR and hydration disagree on the demo button.
 * `next dev` keeps them consistent (and mirrors how the demo is actually used).
 * No AI key is set, so /api/ai takes the deterministic mock-stream branch.
 *
 * Local runs use the system Edge (channel: msedge - no browser download).
 * CI installs chromium.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3123",
    trace: "off",
  },
  projects: [
    {
      name: "chromium",
      ...devices["Desktop Chrome"],
      // Preinstalled-channel strategy (no ~150MB browser download, keeps CI
      // fast and within the Actions quota): local defaults to the system
      // Edge; CI sets E2E_CHANNEL=chrome because GitHub's ubuntu runners
      // always carry Google Chrome (Microsoft ended Edge for Linux, so msedge
      // is NOT assumed on runners). Override anywhere with E2E_CHANNEL.
      use: { launchOptions: { channel: process.env.E2E_CHANNEL ?? "msedge" } },
    },
  ],
  webServer: {
    command: "npx next dev -p 3123",
    url: "http://127.0.0.1:3123/",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3123",
      LICENSE_GATE: "off",
      // demo entry needs BOTH flags in production mode (fail-closed policy)
      NEXT_PUBLIC_ENABLE_DEMO: "true",
      DEMO_IN_PRODUCTION: "true",
      // checkout CTA needs a "configured" provider to render live buttons;
      // the specs stub /api/checkout anyway, so these ids are never called.
      PAYMENT_PROVIDER: "waffo",
      WAFFO_PRICE_ID_BUYOUT: "E2E_DUMMY_B",
      WAFFO_PRICE_ID_CARE: "E2E_DUMMY_C",
      WAFFO_PRICE_ID_FOUNDER: "E2E_DUMMY_F",
      // no AI keys -> deterministic mock stream (NDJSON protocol asserted)
    },
  },
});
