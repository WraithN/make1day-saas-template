---
name: backend-api
description: Implement Route Handlers, Supabase data access, Zod validation, and error handling in a make1day project following its conventions.
---

# Skill: Backend & API (make1day)

Use this skill when adding server logic: API routes, database access, auth, or
webhooks in a make1day project.

## Stack
- Next.js Route Handlers (`app/api/<name>/route.ts`), runtime `nodejs`.
- Supabase (Postgres + Auth). Client created via `@/lib/supabase/*` helpers.
- Validation: Zod. Payments: `@/lib/payments` provider abstraction.
- Env: server-only secrets in `.env.local`; never expose service-role keys to the client.

## Route handler shape
```ts
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  // ... do work
  return NextResponse.json({ ok: true }, { status: 200 });
}
```
- Validate at the boundary with Zod; return 400 with a clear message.
- Use `force-dynamic` or `revalidate` as needed; avoid caching mutable GETs.

## Supabase
- Server: `createServerClient` with cookie forwarding (see `middleware.ts`).
- Never call the browser client in a route handler.
- Service-role key is server-only; gate any admin action behind auth.

## Payments
- Go through `lib/payments` (`createCheckout`, `verifyWebhook`) so the selected
  provider (Stripe/Creem/PayPal/Waffo) is abstracted.
- Verify webhooks with the provider secret; return 200 quickly, process async.

## Auth
- Read the session in middleware/route handlers via Supabase auth.
- Protected routes redirect to `/login?redirect=<path>` when unauthenticated.

## Errors & logging
- Centralize error messages; `console.error` server-side, return safe messages to client.
- Don't leak stack traces or secret values in responses.

## Do / Don't
- DO keep routes thin — push logic into `lib/`.
- DO set explicit `status` codes and `Content-Type`.
- DON'T trust client input; DON'T put secrets in client bundles.

## Common tasks
- Add an endpoint: `app/api/x/route.ts` + Zod schema + add to sitemap/robots if public.
- Add a webhook: verify signature first, return 200, handle events idempotently.
- Add a DB table: write a migration under `supabase/migrations/`, update types.

Run `npx tsc --noEmit` after changes.
