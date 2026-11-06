#!/usr/bin/env node
/**
 * Single source of truth for ShipKit's Agent-Native Delivery documents.
 *
 * Pure ESM, zero dependencies. Called from two places with the SAME spec:
 *   1. lib/generator/pack.ts  — when a ZIP is generated on the site
 *   2. scripts/ai-docs.mjs    — inside the downloaded project, after the user
 *                               edits shipkit.config.json / ai/doc-spec.json
 *
 * `buildDocSet(spec)` returns { "relative/path": "file contents" } so both
 * callers just write the map to disk / into the archive. Nothing here imports
 * Next.js, TypeScript or any npm package.
 */

const RULES_META = [
  {
    id: "core",
    title: "Core boundaries",
    globs: ["app/**/*", "components/**/*", "lib/**/*"],
    always: true,
    body: [
      "TypeScript strict; no implicit any, no @ts-ignore.",
      "A component is a Server Component unless it needs state/effects/browser APIs.",
      "Never import a server-only module (lib/supabase/admin.ts, lib/payments/*, node:crypto, fs) into a \"use client\" file.",
      "All env reads go through lib/env.ts. Clients are lazy so next build works without secrets.",
      "Never import a module that was pruned from this build — check shipkit.config.json first.",
    ],
  },
  {
    id: "style",
    title: "Visual system (style lock)",
    globs: ["app/globals.css", "app/**/*.tsx", "components/**/*.tsx"],
    always: true,
    body: [
      "design.md is the single source of truth. Use CSS custom properties only; never hardcode a hex value in a component.",
      "Respect --radius and the declared texture; do not replace :root with another palette.",
      "System fonts only. No web fonts, no @font-face, no forced grayscale antialiasing.",
      "No backdrop-blur and no transform on elements containing text.",
      "Interactive targets >= 44px; form inputs 16px on mobile; mobile-first breakpoints.",
      "Always verify dark and light (html.light) modes and 375 / 768 / 1280px widths.",
    ],
  },
  {
    id: "api",
    title: "Route handlers & validation",
    globs: ["app/api/**/route.ts", "lib/**/*.ts"],
    always: true,
    body: [
      "Validate every request body with zod before use; return 4xx with a stable error code.",
      "Route handlers that sign/verify payments or touch fs declare runtime = \"nodejs\".",
      "Check errors from Supabase explicitly; never swallow a failed write and return 2xx.",
      "Do not log secrets, raw signatures or full PII.",
      "Paid artifacts require checkEntitlement() before they are returned.",
    ],
  },
  {
    id: "auth",
    title: "Auth & session handling",
    globs: ["app/login/**", "app/auth/**", "middleware.ts", "lib/supabase/**"],
    always: true,
    body: [
      "Browser code may only use the anon key. The service role key never leaves the server.",
      "Use supabase.auth.getUser() (server-validated) for authorization, not just getSession().",
      "OAuth providers must be enabled in NEXT_PUBLIC_OAUTH_PROVIDERS AND in the Supabase dashboard.",
      "Demo mode is development-only and must stay disabled in production.",
    ],
  },
  {
    id: "payments",
    title: "Payments & webhook idempotency",
    globs: ["lib/payments/**", "app/api/checkout/**", "app/api/webhook/**"],
    always: "payment",
    body: [
      "There is exactly ONE webhook endpoint: POST /api/webhook. It dispatches by PAYMENT_PROVIDER.",
      "Verify the signature on the RAW body string before JSON.parse; re-serialising breaks verification.",
      "Missing verification config must fail closed. Never accept an unsigned event.",
      "Deduplicate on eventType + eventId before writing; gateways retry.",
      "buyout = one-time, care = monthly recurring. Never collapse the two modes.",
      "Only grantsAccess events issue a license. subscription.payment_succeeded is deliberately ignored.",
      "If a database write fails return 5xx so the gateway retries.",
    ],
  },
  {
    id: "database",
    title: "Migrations & RLS",
    globs: ["supabase/**", "lib/supabase/admin.ts"],
    always: true,
    body: [
      "Migrations are append-only. Never edit an applied migration.",
      "Every new table enables ROW LEVEL SECURITY; no public policies on licenses or webhook_events.",
      "Server-side writes use SUPABASE_SERVICE_ROLE_KEY via lib/supabase/admin.ts.",
      ".data/*.json is a local fallback only and is NOT durable on serverless.",
      "Vector columns are vector(1536) — changing dimensions needs a new migration.",
    ],
  },
  {
    id: "rag",
    title: "Hybrid RAG",
    globs: ["lib/rag/**", "app/api/rag/**", "components/RagDemo.tsx"],
    always: "rag",
    body: [
      "Pipeline: chunk -> BM25 (Latin + CJK n-grams) -> embeddings -> RRF (k=60).",
      "Never require an API key for the demo: no embedding key degrades to BM25-only, no chat key to extractive answers.",
      "Return retrieval metadata (strategy, embedding, lexical, semantic, store) in every query response.",
      "Citations are 1-indexed and must resolve to a real chunk id.",
      "The default memory store is process-local; serverless needs RAG_VECTOR_STORE=supabase.",
    ],
  },
  {
    id: "i18n",
    title: "Four-language copy",
    globs: ["lib/i18n*.ts", "lib/i18n*.tsx", "components/**/*.tsx"],
    always: true,
    body: [
      "All five locales (en, zh, ja, fr, de) are complete. Never add an en-only key.",
      "Dynamic values use {var} placeholders + interpolate(), never string concatenation of raw HTML.",
      "Highlight markup uses {{g}}...{{/g}}; no JSX in dictionary values.",
      "?lang= seeds sk_lang and is forwarded as x-sk-lang for Server Components. Do not 308-redirect it.",
      "Keep canonical / hreflang in sync with the active locale.",
    ],
  },
  {
    id: "deploy",
    title: "Deploy & env",
    globs: ["next.config.mjs", "wrangler.toml", ".env.example", "middleware.ts"],
    always: true,
    body: [
      "NEXT_PUBLIC_SITE_URL is injected at build time — set it before building, not after.",
      "Set ADMIN_USER / ADMIN_PASSWORD before deploying or /admin stays open.",
      "Never run next dev and next build against the same .next directory: dev overwrites app-paths-manifest.json and next start will 404.",
      "Clean sequence: stop dev -> delete .next -> next build -> next start.",
      "Cloudflare builds still contain Node-runtime routes; audit them before claiming edge support.",
    ],
  },
  {
    id: "account",
    title: "User console (/account)",
    globs: ["app/account/**", "components/console/**", "lib/console.ts", "lib/content/console.ts"],
    always: "account",
    body: [
      "All /account reads go through lib/console.ts; guard every Supabase / license read so an unconfigured env renders an empty state instead of throwing.",
      "The console is read-only: never add a profile mutation endpoint without an RLS policy and a server-side identity check.",
      "Never expose another user's license key. getMyLicenses() filters by the signed-in email.",
      "Copy lives in lib/content/console.ts with all five locales complete — no en-only strings.",
      "middleware.ts gates /account (and /dashboard) with supabase.auth.getUser(); demo mode uses the sk_demo cookie.",
    ],
  },
  {
    id: "admin",
    title: "Admin console (/admin)",
    globs: ["app/admin/**", "components/console/**", "lib/console.ts", "lib/content/console.ts"],
    always: "admin",
    body: [
      "/admin has two independent guards: HTTP Basic Auth (ADMIN_USER / ADMIN_PASSWORD) and the optional ADMIN_EMAILS allowlist. Never remove either.",
      "The system page is read-only and must never print secret VALUES — only configured / not-configured flags.",
      "A missing SUPABASE_SERVICE_ROLE_KEY means the user list is derived from licenses and subscriptions; label it honestly as incomplete.",
      "License keys are shown only inside /admin; do not add them to logs, analytics payloads or JSON-LD.",
      "The consoles are read-only starters with no profile mutation endpoint. Org tables (0007_orgs.sql) and lib/org.ts belong to the multi-tenancy feature and are NOT part of this console; do not describe /admin as a tenant administration UI.",
    ],
  },
];

function activeRules(spec) {
  const c = spec.config;
  return RULES_META.filter((r) => {
    if (r.always === true) return true;
    if (r.always === "payment") return c.payment !== "none";
    if (r.always === "rag") return c.features.includes("rag");
    if (r.always === "account") return c.features.includes("account");
    if (r.always === "admin") return c.features.includes("admin");
    return false;
  });
}

function skillRules(spec) {
  return spec.labels.skills.map((s) => ({
    id: `skill-${s.id}`,
    title: `Skill: ${s.label}`,
    globs: s.globs,
    always: true,
    body: [
      `Load skills/${s.file} before working on files matching these globs.`,
      s.note,
      "Follow its Do / Don't list and run its verification steps before claiming done.",
    ],
  }));
}

function ruleMarkdown(rule, spec) {
  const L = [];
  L.push(`---`);
  L.push(`name: ${rule.id}`);
  L.push(`description: ${rule.title} — scoped rule for ${spec.slug}.`);
  L.push(`globs: ${rule.globs.join(", ")}`);
  L.push(`---`);
  L.push("");
  L.push(`# Rule: ${rule.title}`);
  L.push("");
  L.push(`> Generated by \`npm run ai:docs\` from \`shipkit.config.json\` + \`ai/doc-spec.json\`. Do not edit by hand — edit the manifest and regenerate.`);
  L.push(`> Applies only to: ${rule.globs.map((g) => `\`${g}\``).join(", ")}.`);
  L.push("");
  for (const b of rule.body) L.push(`- ${b}`);
  L.push("");
  L.push("See `AGENTS.md` for the full contract and `design.md` for the visual system.");
  L.push("");
  return L.join("\n");
}

function cursorRule(rule) {
  const L = [];
  L.push("---");
  L.push(`description: ${rule.title}`);
  L.push(`globs: ${rule.globs.join(", ")}`);
  L.push("alwaysApply: false");
  L.push("---");
  L.push("");
  L.push(`# ${rule.title}`);
  L.push("");
  for (const b of rule.body) L.push(`- ${b}`);
  L.push("");
  L.push("Read `AGENTS.md` and `design.md` before making changes in these paths.");
  L.push("");
  return L.join("\n");
}

function buildAgents(spec, rules) {
  const c = spec.config;
  const s = spec.style;
  const app = spec.appName || "My SaaS";
  const L = [];
  const list = (arr) => (arr.length ? arr.map((x) => x.label).join(", ") : "none");
  L.push(`# AGENTS.md — ${app}`);
  L.push("");
  L.push("> **Read this file and `design.md` before editing any code.** They describe this exact generated build, not a generic starter.");
  L.push("> Generated by ShipKit's Agent-Native Delivery pipeline. Source: `shipkit.config.json` + `ai/doc-spec.json`.");
  L.push("> After changing the config run `npm run ai:docs` — never hand-edit generated docs.");
  L.push("");
  L.push("## 1. What this build contains");
  L.push("");
  L.push("| Choice | This build |");
  L.push("| --- | --- |");
  L.push(`| Package | \`${spec.slug}\` |`);
  L.push(`| Auth | ${list(spec.labels.auth)} |`);
  L.push(`| Payments | ${spec.labels.payment.label} (\`${c.payment}\`) |`);
  L.push(`| AI providers | ${list(spec.labels.ai)} |`);
  L.push(`| Features | ${list(spec.labels.features)} |`);
  L.push(`| Visual style | **${s.name}** (\`${c.style}\`, ${s.scheme}) |`);
  L.push(`| Deploy target | ${spec.labels.deploy.label} |`);
  L.push(`| Skills | ${spec.labels.skills.length} playbooks |`);
  L.push("");
  L.push("**Modules not listed above were deliberately pruned at generation time.** Do not re-add them and do not import a file that is absent from the tree.");
  L.push("");
  L.push("## 2. Commands");
  L.push("");
  L.push("```bash");
  L.push("npm install");
  L.push("cp .env.example .env.local   # fill in real values");
  L.push("npm run dev                  # http://localhost:3000");
  L.push("npx tsc --noEmit             # must be clean");
  L.push("npm run build                # must succeed before you finish");
  L.push("npm run ai:docs              # rebuild AGENTS.md, design.md, scoped rules, skills index");
  L.push("npm run ai:setup             # refresh .cursor/rules + CLAUDE.md (ai:docs does this too)");
  L.push("```");
  L.push("");
  L.push("## 3. Repository map");
  L.push("");
  L.push("```");
  L.push("AGENTS.md          <- you are here: root contract for coding agents");
  L.push("design.md          <- style-locked visual system for THIS style");
  L.push("shipkit.config.json<- exact Builder selections (source of truth)");
  L.push("shipkit.config.json<- SOURCE OF TRUTH for selections — edit THIS");
  L.push("ai/doc-spec.json   <- full option catalogue + palettes (rendering constants)");
  L.push("ai/rules/*.md      <- scoped rules with globs frontmatter");
  L.push(".cursor/rules/*.mdc<- same rules in Cursor's native format");
  L.push("CLAUDE.md          <- Claude Code entry point, imports the rules");
  L.push("skills/*.md        <- focused playbooks, one per concern");
  L.push("app/               <- Next.js 15 App Router pages + route handlers");
  L.push("components/        <- UI; 'use client' only where interactivity is needed");
  L.push("lib/               <- env, i18n, payments, ai, subscriptions, rag, generator");
  L.push("supabase/          <- SQL migrations");
  L.push("```");
  L.push("");
  L.push("## 4. Scoped rules (load only what matches your files)");
  L.push("");
  L.push("| Rule | Applies to |");
  L.push("| --- | --- |");
  for (const r of rules) {
    L.push(`| [\`ai/rules/${r.id}.md\`](ai/rules/${r.id}.md) · ${r.title} | ${r.globs.map((g) => `\`${g}\``).join(", ")} |`);
  }
  L.push("");
  L.push("## 5. Skills playbooks");
  L.push("");
  if (spec.labels.skills.length) {
    L.push("| Skill | File | Use when |");
    L.push("| --- | --- | --- |");
    for (const sk of spec.labels.skills) {
      L.push(`| ${sk.label} | [\`skills/${sk.file}\`](skills/${sk.file}) | ${sk.note} |`);
    }
  } else {
    L.push("No skill playbooks were selected in this build.");
  }
  L.push("");
  L.push("## 6. Non-negotiable rules");
  L.push("");
  L.push("1. **TypeScript strict.** No implicit `any`, no `@ts-ignore`. Types live next to the module they describe.");
  L.push("2. **Server/client boundary.** Never import a server-only module into a `\"use client\"` file; keep route handlers on `runtime = \"nodejs\"`.");
  L.push("3. **Env access goes through `lib/env.ts`.** Clients are lazy; never scatter `process.env` reads or expose a secret with a `NEXT_PUBLIC_` prefix.");
  L.push("4. **Design is locked.** Follow `design.md`: CSS tokens only, system fonts, no backdrop-blur/text transforms, 44px tap targets, mobile-first.");
  L.push("5. **i18n.** Every user-facing string goes into `lib/i18n-core.ts` for **all five** languages (en / zh / ja / fr / de).");
  L.push("6. **Payments.** Exactly one webhook route `POST /api/webhook`, dispatched by `PAYMENT_PROVIDER`. Verify the raw body, never skip verification, never log a secret. Buyout is ONE-TIME; Care is recurring.");
  L.push("7. **Don't reintroduce pruned code.** If a provider, feature or skill is missing, it was excluded on purpose.");
  L.push("8. **Verify before claiming done.** Run `npx tsc --noEmit` and `npm run build`; report failures instead of hiding them.");
  L.push("");
  L.push("## 7. Style lock (this build)");
  L.push("");
  L.push("```css");
  L.push(":root {");
  L.push(`  color-scheme: ${s.scheme};`);
  for (const t of s.tokens) L.push(`  ${t.css}: ${t.rgb};`);
  L.push(`  --radius: ${s.radius};`);
  L.push(`} /* texture: ${s.texture} · theme: ${s.name} */`);
  L.push("```");
  L.push("");
  L.push(`Accent \`${s.accentHex}\`, secondary \`${s.accent2Hex}\` — reference values only; components must use the tokens.`);
  L.push("");
  L.push("## 8. Module notes for this build");
  L.push("");
  if (c.payment === "none") {
    L.push("- **Payments:** disabled. `lib/payments/none.ts` throws a clear error on checkout; do not add a gateway without updating `lib/payments/index.ts`.");
  } else if (c.payment === "waffo") {
    L.push("- **Payments (Waffo Pancake):** `WAFFO_FLAVOR=pancake`, `WAFFO_ENVIRONMENT`, `WAFFO_STORE_SLUG` **or** `WAFFO_MERCHANT_ID`+`WAFFO_PRIVATE_KEY`, `WAFFO_WEBHOOK_PUBLIC_KEY_TEST/PROD`, `WAFFO_PRICE_ID_BUYOUT` (one-time) / `_CARE` (subscription). Webhook is RSA-SHA256 over `\\${t}.\\${rawBody}`. `acquiring` is a different, incompatible product; its create-order IS implemented but every contract field comes from `WAFFO_ACQUIRING_*` env vars and the signing/response shape is 需按你的 Waffo 合同核对 (docs/waffo.md §5).");
  } else if (c.payment === "stripe") {
    L.push("- **Payments (Stripe):** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_BUYOUT` (one-time `mode: \"payment\"`), `STRIPE_PRICE_ID_CARE` (`mode: \"subscription\"`).");
  } else {
    L.push(`- **Payments (${spec.labels.payment.label}):** see \`lib/payments/${c.payment}.ts\`. The single webhook URL is \`/api/webhook\`.`);
  }
  L.push(`- **Auth:** ${list(spec.labels.auth)}. OAuth buttons come from \`NEXT_PUBLIC_OAUTH_PROVIDERS\` and must also be enabled in Supabase.`);
  L.push(`- **AI:** ${list(spec.labels.ai)}. \`lib/ai/index.ts\` exposes \`chat()\` / \`streamChat()\` plus \`streamChatChunks()\` (async generator). \`/api/ai\` streams token-by-token and enforces a per-user daily quota (\`AI_MESSAGES_PER_DAY\`, default 50, HTTP 429 when exhausted).`);
  if (c.features.includes("rag")) {
    L.push("- **RAG:** hybrid retrieval — BM25 (Latin + CJK n-grams) fused with dense embeddings via RRF (k=60). Set `EMBEDDING_*` (or `OPENAI_API_KEY`) for the vector branch; without it the module degrades to BM25-only. `RAG_VECTOR_STORE=supabase` needs `0002_rag.sql` (1536 dims).");
  } else {
    L.push("- **RAG:** not included in this build. Do not add `lib/rag/*` imports.");
  }
  if (c.features.includes("multitenancy")) {
    L.push("- **Multi-tenancy:** `0007_orgs.sql` (organizations + memberships + RLS) and `lib/org.ts` (`getActiveOrgId`, `getUserOrgs`, `createOrg`, `requireTenant`) ship in this build. Run the migration yourself and add `.eq(\"org_id\", ...)` to your OWN domain tables — the starter cannot scope tables it does not know. The workspace switcher UI / `/api/org` routes only ship when the `account` console is also selected.");
  }
  if (!c.features.includes("dashboard")) {
    L.push("- **Dashboard:** excluded. The legacy demo console is not part of this build; post-login redirects were rewritten to an existing route.");
  }
  const hasAccount = c.features.includes("account");
  const hasAdmin = c.features.includes("admin");
  if (hasAccount || hasAdmin) {
    const names = [
      hasAccount ? "`/account` (user console: overview, billing, licenses, settings)" : "",
      hasAdmin ? "`/admin` (operator console: users, licenses, traffic, system)" : "",
    ].filter(Boolean).join(" and ");
    L.push(`- **Consoles:** ${names}. Both are Server Components using components/console/* and lib/console.ts, with five-language copy in lib/content/console.ts.`);
    L.push("- `/account` is gated by the Supabase session; `/admin` by HTTP Basic Auth plus the optional `ADMIN_EMAILS` allowlist. They are read-only starters — no profile mutations, no RBAC table.");
  } else {
    L.push("- **Consoles:** neither the user nor the admin console is included. `components/console/*`, `lib/console.ts` and `lib/content/console.ts` were pruned; do not import them.");
  }
  L.push(`- **Deploy (${spec.labels.deploy.label}):** follow the README section. All API routes use the Node.js runtime.`);
  L.push("");
  L.push("## 9. Definition of done");
  L.push("");
  L.push("- [ ] `npx tsc --noEmit` clean");
  L.push("- [ ] `npm run build` succeeds");
  L.push("- [ ] New copy translated in all five languages");
  L.push("- [ ] UI verified on mobile + desktop, dark + light");
  L.push("- [ ] No secrets in client code or logs");
  L.push("- [ ] `npm run ai:docs` re-run if any Builder selection changed");
  L.push("");
  return L.join("\n");
}

function buildDesign(spec) {
  const s = spec.style;
  const c = spec.config;
  const app = spec.appName || "My SaaS";
  const L = [];
  L.push(`# Design System — ${app}`);
  L.push("");
  L.push(`> Generated by ShipKit for the **${s.name}** style (\`${c.style}\`).`);
  L.push("> Single source of truth for visual decisions. Keep `app/globals.css` in sync; read `AGENTS.md` for collaboration rules.");
  L.push(`> Regenerate with \`npm run ai:docs\` after editing \`shipkit.config.json\`.`);
  L.push("");
  L.push("## 1. Style identity");
  L.push("");
  L.push("| Property | Value |");
  L.push("| --- | --- |");
  L.push(`| Style id | \`${c.style}\` |`);
  L.push(`| Name | ${s.name} |`);
  L.push(`| Mood | ${s.mood} |`);
  L.push(`| Colour scheme | **${s.scheme}** (\`color-scheme: ${s.scheme}\`) |`);
  L.push(`| Corner radius | \`--radius: ${s.radius}\` |`);
  L.push(`| Surface texture | \`${s.texture}\` |`);
  L.push("");
  L.push(`**Texture rule:** ${s.textureRule}`);
  L.push("");
  if (s.scheme === "light") {
    L.push("This is a **light** style. The theme toggle adds `html.light` which re-applies the Paper palette. Never introduce dark-only colours without a light counterpart.");
  } else {
    L.push("This is a **dark** style. The theme toggle adds `html.light`, which swaps to the Paper palette — test both schemes after a colour change.");
  }
  L.push("");
  L.push("## 2. Colour tokens");
  L.push("");
  L.push("All colours are space-separated RGB channels consumed as `rgb(var(--x) / <alpha>)`.");
  L.push("**Never hardcode a hex value in a component.**");
  L.push("");
  L.push("| Token | RGB | HEX | Use for |");
  L.push("| --- | --- | --- | --- |");
  for (const t of s.tokens) {
    L.push(`| \`${t.css}\` | \`${t.rgb}\` | \`${t.hex}\` | ${t.role} |`);
  }
  L.push("");
  L.push("```tsx");
  L.push("// Correct");
  L.push('<div className="card border-line text-ink-soft">…</div>');
  L.push("style={{ color: 'rgb(var(--accent) / 0.8)' }}");
  L.push("// Wrong: breaks theme switching and the light-mode override");
  L.push(`// style={{ color: '${s.accentHex}' }}`);
  L.push("```");
  L.push("");
  L.push("Contrast contract: primary text (`--ink`) on `--bg`, secondary (`--ink-soft`) on `--surface`, and `--bg` as the label on solid `--accent` buttons. Re-check all three pairs after any token change.");
  L.push("");
  L.push("## 3. Typography");
  L.push("");
  L.push("```css");
  L.push(`--font-sans: ${spec.font.sans};`);
  L.push(`--font-mono: ${spec.font.mono};`);
  L.push("```");
  L.push("");
  L.push("- **System fonts only.** No web-font request, no `@font-face`: native hinting keeps glyphs crisp and CJK renders with the correct face.");
  L.push("- `-webkit-font-smoothing: auto`, `text-rendering: auto`, `font-synthesis: weight style`. Do not force grayscale antialiasing or `optimizeLegibility`.");
  L.push("- Body 16px / 1.6. Headings `font-semibold`, not bold blacks.");
  L.push("- `.eyebrow`: mono, 11–12px, uppercase, `tracking-[0.18em]`, accent colour. `.tag` / `.chip`: mono 11px metadata.");
  L.push("- Form inputs **16px on mobile** (`text-base`) or iOS Safari auto-zooms; drop to `sm:text-sm` at ≥640px.");
  L.push("");
  L.push("## 4. Shape, spacing, motion");
  L.push("");
  L.push(`- Radius \`var(--radius)\` = \`${s.radius}\` applied to \`.card\`, \`.btn-solid\`, \`.btn-ghost\`, \`.input\`. Do not override per component.`);
  L.push("- Borders 1px `--line`. Cards use `--surface` on `--bg` with `p-4 sm:p-5`.");
  L.push("- Spacing scale 4 / 8 / 12 / 16 / 24 / 32 / 48px. Section padding `py-12 sm:py-20`.");
  L.push("- **No `backdrop-blur`** and no `transform` on elements containing text — a compositing layer rasterises the label and makes it blurry. Hover feedback is `box-shadow` only.");
  L.push("- Solid surfaces, transitions ≤ 150ms.");
  L.push("");
  L.push("## 5. Component vocabulary");
  L.push("");
  L.push("| Class | Purpose |");
  L.push("| --- | --- |");
  L.push("| `.wrap` | Centred container, `max-w-6xl`, `px-4 sm:px-5` |");
  L.push("| `.card` | Bordered surface panel |");
  L.push("| `.btn-solid` | Primary CTA: accent fill, bg-coloured label, ≥44px |");
  L.push("| `.btn-ghost` | Secondary CTA: line border, accent on hover, ≥44px |");
  L.push("| `.input` | Text field, ≥44px, accent focus border |");
  L.push("| `.eyebrow` / `.tag` / `.chip` | Mono metadata labels |");
  L.push("| `.grad-text` | Accent → accent2 gradient on a short heading only |");
  L.push("| `.tech-grid` | Masked hero grid (only when the texture is `grid`) |");
  L.push("");
  L.push("## 6. Responsive & accessibility");
  L.push("");
  L.push("- Mobile-first: base is the phone layout; `sm:` / `md:` / `lg:` for larger screens.");
  L.push("- `Nav.tsx` collapses into a hamburger below `md`; keep keyboard/Escape handling.");
  L.push("- `<meta name=\"viewport\">` + `viewport` export live in `app/layout.tsx`.");
  L.push("- Multi-column grids collapse to one column on phones.");
  L.push("- Respect `color-scheme`, the `html.light` override and `prefers-reduced-motion`.");
  L.push("");
  L.push("## 7. Checklist before shipping a UI change");
  L.push("");
  L.push("- [ ] Uses CSS tokens, not literal colours");
  L.push("- [ ] Works in dark and light (`html.light`)");
  L.push("- [ ] Checked at 375px, 768px and 1280px");
  L.push("- [ ] Tap targets ≥44px, inputs 16px on mobile");
  L.push("- [ ] No web fonts, no backdrop-blur, no text transforms");
  L.push(`- [ ] Radius still \`${s.radius}\` and texture still \`${s.texture}\``);
  L.push("");
  return L.join("\n");
}

function buildSkillsIndex(spec) {
  const L = [];
  L.push("# Skills — this build");
  L.push("");
  L.push(`> Generated by \`npm run ai:docs\`. ${spec.labels.skills.length} of 12 playbooks were selected in the Builder.`);
  L.push("> Each file has `name` / `description` / `globs` frontmatter so an agent can pick the right one automatically.");
  L.push("");
  if (spec.labels.skills.length) {
    L.push("| Skill | File | Covers | Globs |");
    L.push("| --- | --- | --- | --- |");
    for (const s of spec.labels.skills) {
      L.push(`| ${s.label} | \`${s.file}\` | ${s.note} | ${s.globs.map((g) => `\`${g}\``).join(", ")} |`);
    }
  } else {
    L.push("No skills selected. `AGENTS.md` still defines the core rules.");
  }
  L.push("");
  L.push("Load `AGENTS.md` first, then the scoped rule matching the files you touch, then the playbook above.");
  L.push("");
  return L.join("\n");
}

function buildAiReadme(spec) {
  const L = [];
  L.push("# AI setup (generated)");
  L.push("");
  L.push("Every AI-facing document is generated from `shipkit.config.json` (selections) + `ai/doc-spec.json` (full option catalogue, palettes and rendering constants). The manifest always wins.");
  L.push("");
  L.push("| Path | Consumer |");
  L.push("| --- | --- |");
  L.push("| `AGENTS.md` | All agents (root contract) |");
  L.push("| `design.md` | All agents (visual system) |");
  L.push("| `ai/rules/*.md` | Generic agents with globs support |");
  L.push("| `.cursor/rules/*.mdc` | Cursor |");
  L.push("| `CLAUDE.md` | Claude Code |");
  L.push("| `skills/*.md` | Any agent, one playbook per concern |");
  L.push("");
  L.push("## Change the configuration, not the outputs");
  L.push("");
  L.push("```bash");
  L.push("# edit shipkit.config.json (selections) or ai/doc-spec.json (catalogue/tokens)");
  L.push("npm run ai:docs     # rebuild every document + refresh tool integrations");
  L.push("npm run ai:setup    # only refresh .cursor/rules and CLAUDE.md");
  L.push("npm run ai:setup -- --tool cursor   # cursor | claude | all");
  L.push("```");
  L.push("");
  L.push("`ai:docs` writes files deterministically; re-running it with an unchanged spec produces byte-identical output.");
  L.push("");
  L.push("**Changing `style` regenerates the documents but NOT `app/globals.css`** — the CSS is injected into the ZIP at build time. For a real palette switch, generate a new project in the Builder.");
  L.push(`This build ships ${spec.labels.skills.length} skills and the scoped rules listed in \`ai/rules/README.md\`.`);
  L.push("");
  return L.join("\n");
}

function buildRulesIndex(rules) {
  const L = [];
  L.push("# Scoped rules");
  L.push("");
  L.push("> Generated by `npm run ai:docs`. Load a rule only when your task touches its globs.");
  L.push("");
  L.push("| Rule | Globs |");
  L.push("| --- | --- |");
  for (const r of rules) {
    L.push(`| [\`${r.id}.md\`](${r.id}.md) · ${r.title} | ${r.globs.map((g) => `\`${g}\``).join(", ")} |`);
  }
  L.push("");
  L.push("Cursor reads the same rules from `.cursor/rules/*.mdc`; Claude Code gets the index in `CLAUDE.md`.");
  L.push("");
  return L.join("\n");
}

function buildClaude(spec, rules) {
  const L = [];
  L.push(`# CLAUDE.md — ${spec.appName || "My SaaS"}`);
  L.push("");
  L.push("Read `@AGENTS.md` first — it is the root contract for this repository.");
  L.push("Read `@design.md` before any UI change — the visual system is style-locked.");
  L.push("Read `@shipkit.config.json` to see which modules were pruned; never import an absent module.");
  L.push("");
  L.push("## Scoped rules (load the ones matching the files you edit)");
  L.push("");
  for (const r of rules) L.push(`- @ai/rules/${r.id}.md — ${r.title} (\`${r.globs.join(", ")}\`)`);
  L.push("");
  if (spec.labels.skills.length) {
    L.push("## Skills playbooks");
    L.push("");
    for (const s of spec.labels.skills) L.push(`- @skills/${s.file} — ${s.label}: ${s.note}`);
    L.push("");
  }
  L.push("## Before you finish");
  L.push("");
  L.push("- `npx tsc --noEmit` and `npm run build` must both pass.");
  L.push("- New copy needs all five locales (en / zh / ja / fr / de).");
  L.push("- If you changed `shipkit.config.json`, run `npm run ai:docs`.");
  L.push("");
  return L.join("\n");
}

function slugify(name) {
  return (
    String(name || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "shipkit-app"
  );
}

/**
 * Re-derive labels + style from a (possibly edited) BuilderConfig using the
 * FULL catalogue. This is what makes `npm run ai:docs` a real regeneration
 * tool: changing shipkit.config.json changes the documents, not just the ZIP.
 * Specs without a catalogue (older builds) keep their pre-derived labels.
 */
export function deriveSpec(base, overrideConfig) {
  const config = { ...base.config, ...(overrideConfig || {}) };
  if (!base.catalog) return { ...base, config };
  const cat = base.catalog;
  const pick = (arr, id) => (arr || []).find((x) => x.id === id);
  const pickMany = (arr, ids) =>
    (ids || []).map((id) => pick(arr, id)).filter(Boolean);
  return {
    ...base,
    appName: String(config.appName || "").trim() || "My SaaS",
    slug: slugify(config.appName),
    config,
    style: cat.styles?.[config.style] ?? base.style,
    labels: {
      auth: pickMany(cat.auth, config.auth),
      payment: pick(cat.payment, config.payment) ?? {
        id: config.payment,
        label: config.payment,
      },
      deploy: pick(cat.deploy, config.deploy) ?? {
        id: config.deploy,
        label: config.deploy,
      },
      ai: pickMany(cat.ai, config.ai),
      features: pickMany(cat.features, config.features),
      skills: pickMany(cat.skills, config.skills),
    },
  };
}

/**
 * Build every generated document. Returned keys are POSIX relative paths.
 */
export function buildDocSet(input) {
  const spec = deriveSpec(input, input.config);
  const rules = [...activeRules(spec), ...skillRules(spec)];
  const docs = {};
  docs["AGENTS.md"] = buildAgents(spec, rules);
  docs["design.md"] = buildDesign(spec);
  docs["skills/README.md"] = buildSkillsIndex(spec);
  docs["ai/README.md"] = buildAiReadme(spec);
  docs["ai/rules/README.md"] = buildRulesIndex(rules);
  for (const r of rules) {
    docs[`ai/rules/${r.id}.md`] = ruleMarkdown(r, spec);
    docs[`.cursor/rules/${r.id}.mdc`] = cursorRule(r);
  }
  docs["CLAUDE.md"] = buildClaude(spec, rules);
  return docs;
}

/** Paths belonging to Cursor / Claude Code integration only. */
export function isToolFile(rel) {
  return rel.startsWith(".cursor/rules/") || rel === "CLAUDE.md";
}

export default buildDocSet;
