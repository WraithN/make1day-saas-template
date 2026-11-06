# ShipKit Skills — 12 AI coding playbooks

Self-contained playbooks that ship with a ShipKit project. Each file has YAML
frontmatter (`name`, `description`, `globs`) so a coding agent can pick the right
one automatically. `AGENTS.md` is the entry point; `ai/rules/*.md` are the scoped
rules that point at these playbooks.

| Skill | File | What it covers |
| --- | --- | --- |
| Frontend Dev | `frontend-dev.md` | React 19 / Next.js 15 App Router / TS conventions, server vs client |
| UI Design | `ui-design.md` | Design tokens, spacing, component patterns, accessibility |
| Backend & API | `backend-api.md` | Route handlers, Supabase, Zod, error handling |
| Testing & QA | `testing-qa.md` | Vitest + Playwright setup, what to test, checklists |
| SEO & Content | `seo-content.md` | Metadata, blog, `llms.txt`, hreflang, GEO |
| Auth & Security | `auth-security.md` | Supabase sessions, OAuth, middleware gating, demo mode |
| Payments & Webhooks | `payments.md` | One webhook, raw-body RSA verify, one-time vs recurring |
| Database & RLS | `database.md` | Migrations, service role, row level security |
| Hybrid RAG | `rag.md` | BM25 + embeddings + RRF, ingest/query, no-key fallback |
| i18n (5 languages) | `i18n.md` | Dictionary, `Trans` vars, SSR lang, hreflang |
| Deploy & Env | `deploy.md` | Vercel / Cloudflare / self-host, runtime limits |
| Agent Workflow | `agent-workflow.md` | Reading order, `ai:docs`, definition of done |

> Only the skills selected in the Builder are copied into a generated project,
> and this index is regenerated to list exactly those. Run `npm run ai:docs`
> after changing `shipkit.config.json`.
