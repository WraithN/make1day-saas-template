---
name: agent-workflow
description: Start any coding task in a make1day project — load AGENTS.md, design.md, scoped rules and the right skill before writing code.
globs: AGENTS.md, design.md, ai/**, .cursor/**, CLAUDE.md, skills/**, app-template.config.json
---

# Skill: Agent Workflow (make1day)

This repository is generated to be **agent-native**. Follow this order for every task.

## 1. Read the contract (before editing anything)
1. `AGENTS.md` — root instructions: what is in this build, commands, boundaries, definition of done.
2. `design.md` — the **style-locked** visual system for this exact download.
3. `app-template.config.json` — the source of truth for selected/pruned modules.
4. `ai/rules/*.md` — scoped rules with `globs` frontmatter; load only the rules whose globs match the files you are touching.
5. `skills/<relevant>.md` — one focused playbook for the current task.

## 2. Respect the prune boundary
Files not listed in `AGENTS.md` were **deliberately removed** at generation time. Never `import` a provider, feature or skill that is absent. If a task genuinely needs a missing module, say so first — do not silently re-add half of it.

## 3. Keep the docs in sync
After changing `app-template.config.json` (style, payment, features, skills):
```bash
npm run ai:docs    # rebuild AGENTS.md, design.md, scoped rules, skills index
npm run ai:setup   # refresh .cursor/rules/*.mdc and CLAUDE.md
```
`app-template.config.json` is the source of truth for selections; `ai/doc-spec.json` carries the full option catalogue and palettes. `ai:docs` also refreshes `.cursor/rules/*` and `CLAUDE.md` — edit the manifest, never the generated files.

## 4. Definition of done
- [ ] `npx tsc --noEmit` clean
- [ ] `npm run build` succeeds
- [ ] New copy added to **all five** locales
- [ ] UI checked at 375 / 768 / 1280px in both themes
- [ ] No secrets in client code or logs
- [ ] `design.md` updated if a token changed
- [ ] `npm run ai:docs` re-run if the config changed

## Anti-patterns
- Guessing a file exists because a generic Next.js starter has it.
- Replacing `:root` tokens with a new palette — use the Builder instead.
- Adding `backdrop-blur` or text transforms (blurry type).
- Claiming success without running the two commands above.
