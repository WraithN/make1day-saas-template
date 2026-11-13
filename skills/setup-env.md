---
name: setup
description: Detect the developer's environment, install missing CLIs (Node, git, Vercel, Supabase, wrangler, gh) and configure API keys through a local web page. TRIGGER ON: "初始化", "环境检查", "配置密钥", "setup", "init", "onboarding", "getting started", "install the tools", "第一次运行" - run this BEFORE any other skill when the project has just been downloaded or unboxed.
globs: .env.example, scripts/setup-doctor.mjs, scripts/setup-wizard.mjs, package.json
---

# Skill: Environment Setup & Onboarding (make1day)

The first five minutes on a fresh machine. Two CLIs ship with this project:

```bash
node scripts/setup-doctor.mjs     # detect toolchain, print per-OS install cmds
node scripts/setup-wizard.mjs     # local 127.0.0.1 page to paste keys -> .env.local
```

## Agent workflow (trigger: 初始化 / setup / first run)

1. **Detect.** Run `node scripts/setup-doctor.mjs --json`. Read `tools[]`:
   required gaps (Node <20, no npm, no git) block everything; optional gaps
   only matter if the buyer's config uses that provider (Vercel deploy →
   vercel CLI; Supabase → supabase CLI; Cloudflare target → wrangler;
   pushing to GitHub → gh).
2. **Install (with consent).** Show the user the exact per-OS commands the
   doctor printed. `--fix` auto-runs only the `npm i -g ...` ones; for
   brew/winget/apt, hand the user the command - never run a system package
   manager without their explicit yes.
3. **Configure keys.** Run `node scripts/setup-wizard.mjs`. It serves a page
   on **127.0.0.1:7777** only, built live from `.env.example`, so the fields
   always match THIS build's `lib/env.ts`. Each section has an illustrated
   guide slot: screenshots live at `docs/screenshots/<PREFIX>.png` - if a
   figure reports "not captured yet", walk the user through the provider
   dashboard from its docs link instead of inventing steps.
   The wizard writes filled values into `.env.local` (mode 0600, blank =
   keep existing). Never echo secret values into chat or logs.
4. **Verify.** `npm install`, then `npm run dev`, then hit
   `http://localhost:3000/api/payments/self-check` → `missing` must be empty
   for the selected gateway. Supabase: `npx supabase db push` after the URL
   keys are in. The build itself must stay green with NO secrets (lazy
   clients) - if it doesn't, that's a bug, not the user's fault.
5. **Next.** Point the user at `AGENTS.md` (the repo contract) and the
   payments/deploy skills for their provider.

## Rules
- The wizard binds 127.0.0.1 and writes only `.env.local`. Never suggest
  pasting keys into chat, a git-tracked file, or a public form.
- `.env.example` is the source of truth for what keys THIS build reads - if
  you add an env var to `lib/env.ts`, document it there or the wizard
  silently omits the field.
- Missing optional CLIs are warnings, not failures; the project runs on
  `npx` for most of them anyway.
