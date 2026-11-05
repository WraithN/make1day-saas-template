---
name: auth-security
description: Work on Supabase Auth, OAuth providers, sessions and middleware route protection in a ShipKit project without breaking the server/client boundary.
globs: app/login/**, app/auth/**, middleware.ts, lib/supabase/**, lib/demo.ts
---

# Skill: Auth & Security (ShipKit)

Use this skill for sign-in, session handling, protected routes and demo mode.

## Source of truth
- `lib/supabase/client.ts` — browser client, `createSupabaseBrowserClient()`.
- `lib/supabase/server.ts` — server client, reads cookies via `next/headers`.
- `lib/supabase/admin.ts` — **service role**, server only. Never import into a client component.
- `middleware.ts` — gates `/dashboard` and `/admin`; also seeds the `sk_lang` cookie.
- `NEXT_PUBLIC_OAUTH_PROVIDERS` — comma-separated list rendered on `/login`.

## Rules
- The browser client may only use the **anon** key. A service role key in client code is a critical incident.
- OAuth buttons must be enabled in **both** the env list and the Supabase dashboard; otherwise the provider 400s.
- `app/auth/callback/route.ts` exchanges the code for a session. Keep it a Route Handler with `runtime = "nodejs"`.
- Demo mode (`lib/demo.ts`) is gated by `NEXT_PUBLIC_ENABLE_DEMO` **and** the absence of real Supabase config. Never enable it in production.
- After login, redirects go to `/dashboard` — unless the dashboard was pruned at generation time, in which case they were rewritten to `/`. Check `shipkit.config.json` before changing them.
- `/admin` is protected by Basic Auth only when `ADMIN_USER` / `ADMIN_PASSWORD` are set. Do not remove that check.

## Session patterns
- Server: `const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();`
- Client: `useEffect` + `supabase.auth.onAuthStateChange`, always unsubscribe in cleanup.
- Never trust a client-supplied `userId`. Derive it from the session inside the Route Handler.

## Do / Don't
- DO check `getUser()` (validates with the auth server), not just `getSession()`.
- DO keep `httpOnly` cookies for anything sensitive (`sk_license` uses this pattern).
- DON'T log tokens, codes or cookies. DON'T put secrets behind a `NEXT_PUBLIC_` prefix.
- DON'T add a second auth library — this repo is committed to `@supabase/ssr`.

## Verify
`npx tsc --noEmit` → `npm run build` → sign in with email + one OAuth provider → reload a protected route.
