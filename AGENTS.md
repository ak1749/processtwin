# AGENTS.md

Standing rules for any coding agent working in this repository. These apply on every turn, regardless of which task you were given. `PROCESS.md` is the specification; this file is the working agreement.

---

## Project

ProcessTwin — a visual business-process simulator where a human works on a node canvas and an AI agent works on the same state through WebMCP tools published by the page. Built for the OpenAI WebMCP Challenge. Next.js App Router, TypeScript strict, no backend.

Read `PROCESS.md` before writing code. When a prompt names a section (for example "§11"), that section is authoritative and you should follow it literally rather than improvising an equivalent.

---

## The one architectural rule

**Every mutation, from either interface, goes through exactly one command function in `src/domain/commands/`.**

```
Human UI action  ──┐
                   ├──▶  src/domain/commands/*  ──▶  store
WebMCP tool call ──┘
```

There is no WebMCP-only code path and no UI-only code path. This is the entire premise of the project — if the two interfaces can diverge, the product has no story.

Concretely:

- Components never call `store.setState` or mutate store state directly. They call commands.
- Files under `src/webmcp/` contain **no business logic**. A WebMCP tool validates its input, calls a command with `actor: 'agent'`, and wraps the result in a `ToolEnvelope`. That is all it does.
- If you are writing conditional logic, referential checks, or state transformation inside `src/webmcp/`, stop. It belongs in a command.
- Before reporting a task complete, run `rg "useProcessStore|setState|getState\(\)" src/webmcp`. Anything beyond imports of command functions is a violation you must fix.

---

## WebMCP conventions

- Use `document.modelContext`, **never** `navigator.modelContext`. The getter moved from `Navigator` to `Document` in the May 2026 spec draft; the old name still works but is deprecated in Chromium 150+, and the challenge rules specify `document.modelContext.registerTool`.
- Feature-detect with `'modelContext' in document`. The app must work fully when it is absent, and must never throw.
- Register inside a `useEffect` under an `AbortController`; unregister on abort, wrapped in try/catch.
- Wrap each `registerTool` call individually so one failure cannot silently drop the rest. Count actual successes, not intended registrations.
- Every tool returns the `ToolEnvelope` from `src/webmcp/envelope.ts`, serialised as `{ content: [{ type: 'text', text: JSON.stringify(envelope) }] }`. Never throw a raw string or return an unwrapped object.
- Every error is one of the codes in `PROCESS.md` §10, and must be recoverable in a single round trip — return the valid alternatives, the failing field path, or the blocking policy label, so the agent can correct itself without another query.
- Tool descriptions teach the agent how the product works. "Creates a node" is not acceptable. Match the register of the descriptions quoted in `PROCESS.md` §11.
- Never write anything instruction-shaped into a tool description or a returned `summary`. These are first-party product text, not a channel for steering the agent.

---

## Schema

Zod is the single source of schema truth. JSON Schema for `inputSchema` is **generated** from Zod via `zod-to-json-schema`, never hand-written. Two hand-maintained schemas will drift, and the symptom is an agent sending fields your validator rejects.

---

## Simulation

`src/domain/simulation/simulate.ts` runs **two passes**. Pass one measures per-step visit rates with queue wait forced to zero. Pass two uses those rates to compute per-step utilisation and mean queue wait, then runs for real. A single-pass implementation produces zeros for queue wait, which silently breaks the product's central claim that capacity changes affect latency. Do not write one.

The PRNG is seeded (mulberry32). The same seed must produce byte-identical output. If a golden snapshot test fails after a refactor, that is a bug in the refactor — do not update the snapshot to make it pass.

---

## Scope discipline

- Implement only the phase you were asked for. Do not start the next one.
- Do not refactor files outside the current phase's scope.
- Do not add dependencies beyond those listed in `PROCESS.md` §4 without asking first.
- Do not add tests beyond `PROCESS.md` §14. No Playwright, no React Testing Library, no Storybook.
- Prefer deleting code over adding abstraction. This is a seven-day hackathon build, not a platform.

## Never build

An in-app chat interface. Authentication, accounts, teams, or billing. A backend, database, or ORM. Realtime multiplayer. A mobile layout. Import/export. A Web Worker for simulation. More than one process template. An `apply_scenario` WebMCP tool — merging a scenario is a human UI action, deliberately.

---

## Version control

You own git. After every task, once `npm run verify` passes:

```bash
git add -A
git commit -m "phase N: <short description of what changed>"
git push
```

Rules:

- **Never commit if `verify` fails.** Report the failure and stop. A red commit on `main` is worse than no commit.
- Check `git status` before staging. Never commit `.env*`, `.vercel/`, `node_modules/`, `.next/`, or anything containing a key or token. If `.gitignore` does not already cover these, fix `.gitignore` first.
- One commit per task. Do not batch several phases into one commit — the commit history is submission evidence and needs to show real progression.
- Work directly on `main`. Do not create branches, open pull requests, or tag releases.
- **Never** `git push --force`, `git reset --hard`, `git rebase`, or `git commit --amend` on anything already pushed. History is append-only here.
- Do not add, change, or remove git remotes.
- If `git push` fails with an authentication error, **stop and report it**. Do not attempt to authenticate, do not run `gh auth login`, do not write credentials or tokens to any file. The human handles authentication.

---



- TypeScript strict. No `any` in application code; the WebMCP declarations in `src/types/webmcp.d.ts` declare only the interfaces actually used rather than suppressing the API with `any`.
- Named exports. One command per file. Colocate a component's styles with the component.
- Tailwind only, no CSS-in-JS. Follow the visual direction in `PROCESS.md` §12 — restrained and professional, minimal shadow, no gradients.
- Every icon-only control gets an `aria-label`. Every input gets a label.

---

## Definition of done

1. Run `npm run verify` (`tsc --noEmit && vitest run && next build`).
2. If it fails, report the failure and stop — do not commit.
3. If it passes, commit and push per the Version control section above.
4. Paste the full `verify` output, list the files you changed, and give the commit hash.
5. Stop.

Do not summarise `PROCESS.md` back to me. Do not describe what you are about to do before doing it. Do not report a task complete without having run `verify`.
