---
name: testing-qa
description: Set up and run tests in a make1day project (Vitest for units, Playwright for e2e) and apply a QA checklist before shipping.
---

# Skill: Testing & QA (make1day)

Use this skill when adding tests or doing a pre-ship QA pass on a make1day project.

## Tooling
- **Unit/integration:** Vitest (`*.test.ts` next to source or in `__tests__`).
- **E2E:** Playwright (`e2e/*.spec.ts`) — covers critical user flows.
- Run: `npm run test` (vitest), `npx playwright test` (e2e).

## What to test
- Pure functions in `lib/` (formatters, generators, config mappers).
- API route handlers: success + validation-failure paths (mock Supabase/payments).
- Critical UI flows: sign-in, subscribe (mock provider), generate template.

## Unit test pattern
```ts
import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/generator/config";

describe("slugify", () => {
  it("lowercases and dashes", () => {
    expect(slugify("My SaaS!")).toBe("my-saas");
  });
});
```

## E2E pattern
```ts
import { test, expect } from "@playwright/test";
test("login redirects when unauthenticated", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
```

## QA checklist (before declaring done)
- [ ] `npx tsc --noEmit` passes (0 errors).
- [ ] `npm run build` succeeds.
- [ ] `npm run test` green.
- [ ] Manual: dark + light toggle works; language switch keeps content.
- [ ] Manual: the generated template zip builds after `npm install`.
- [ ] No secrets/keys committed (`.env.local` gitignored).
- [ ] Public routes present in `app/sitemap.ts`; robots/llms.txt sane.
- [ ] No console errors on key pages.

## Do / Don't
- DO test the generator's output shape (zip contains expected files).
- DON'T write flaky e2e that depends on real third-party APIs — mock them.
- DON'T skip the build check; type errors hide runtime bugs.

Keep tests fast and deterministic; prefer unit over e2e for logic.
