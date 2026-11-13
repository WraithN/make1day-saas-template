---
name: grill
description: Interrogate a feature request before writing any code. Ask about goal, user, success criteria, scope edges, data, failure modes and rollback - then restate a one-paragraph spec and get a yes. TRIGGER ON: "新需求", "加个功能", "帮我做", "改造", "优化一下", "grill", "scope this", "new feature", "I want you to add", "let's build" - whenever a task COULD be specced differently, grill first. Skip only when the user says "just do it" or the change is a one-liner fix.
globs: docs/requirements/**, ai/doc-spec.json, AGENTS.md, app/**, components/**, lib/**
---

# Skill: Grill Me (requirements interrogation)

Most failed features are built from the wrong sentence. Before implementing
anything non-trivial, run this interview. One round, grouped questions -
not a twenty-turn interrogation quiz.

## The seven probes
1. **Job to be done.** What does a user DO differently after this ships -
   in one sentence? ("Export a cost report" not "improve the dashboard".)
2. **Who.** Which persona hits this first - you, your customer, your
   admin? Different personas mean different gates and copy.
3. **Success test.** Name ONE observable check that proves it works
   (a page, an API response, a CSV row). If it can't be named, the feature
   isn't specced.
4. **Edges of scope.** What is explicitly NOT in this change? Make the
   user say it out loud - "and while we're at it" is where projects die.
5. **Data + state.** Where does the input live, who can see it, what
   happens with empty / duplicate / oversized / PII input? RLS applies?
6. **Failure modes.** Network dies mid-save, webhook replays, AI returns
   garbage, payment partial - what should the user SEE? Decide now, not in
   the error handler.
7. **Rollback + blast radius.** One config flag, one migration, or a
   breaking column change? If two answers are possible, the user must
   choose before coding.

## Output
Restate the feature as a paragraph the user can answer with "yes":

> You want <job> for <persona>, proven by <success test>, without <edges>.
> Data lives in <store>; empty/dup/PII inputs behave as <rule>; failures
> surface as <UX>; rollback is <mechanism>. Ship?

If the answer contains a "but", you have round two - ask only about that
"but". When the answers change the schema or an API contract, write the
spec to `docs/requirements/<feature>.md` (short) and update the affected
`ai/rules/*` only if the contract itself changed.

## Rules
- Grilling is an interview, not a lecture: questions only, one round, no
  implementation hints until the spec is confirmed.
- Never invent constraints the user didn't state; "probably fine" is a
  question you didn't ask.
- Trivial fixes (typos, dead links, obvious bugs) skip the interview - the
  cost of grilling must stay below the cost of rework.
