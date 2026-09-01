# ProcessTwin — Build Specification v2

**Target:** OpenAI WebMCP Challenge (Devpost)
**Hard deadline:** Sep 3, 2026 · 1:00 pm PDT (= Sep 4, 6:00 am AEST). The tweet says 5pm; the Official Rules say 1pm and the Official Rules govern. Treat 1pm PDT as the wall.
**Judging:** four equally weighted criteria — WebMCP Leverage, Execution, Potential Impact, Creativity & Ambition.

This document supersedes the earlier build guide. Where they disagree, this wins.

---

## 0. How to drive Codex with this document

This file lives in your project root as `PROCESS.md`, alongside `AGENTS.md`. Codex reads `AGENTS.md` automatically on every turn; `PROCESS.md` is the specification it consults when a prompt points at a section.

You are building locally first. `document.modelContext` requires a secure context, and **`http://localhost:3000` counts as one** — so the whole build, including agent testing, happens on localhost. GitHub and Vercel come at the end (§21).

Work **one phase at a time** (§17). For each phase, open a fresh Codex session and give it:

```
Read PROCESS.md and AGENTS.md. Implement Phase N only.
Do not start Phase N+1. Do not refactor code outside Phase N's scope.
When done, run `npm run verify` and paste the output, then stop.
```

Three rules that matter more than they sound:

1. **Never let Codex touch §11 (tool catalogue) and §8 (simulation) in the same session.** They are the two places where drift is invisible until demo day.
2. **After every phase, you personally load the app and click through it.** Codex will report success on things that do not render.
3. **Codex owns git.** `AGENTS.md` instructs it to commit and push after every task, but only once `npm run verify` passes, so `main` never carries a broken build. You run `gh auth login` once; you never touch git again. The rules require dated commit history proving the work happened inside the submission window, and this produces it without you thinking about it.

---

## 1. The product, in one paragraph

ProcessTwin is a visual business-process simulator where the human works on a canvas and an AI agent works on the *same state* through WebMCP tools published by the page. The agent never sees pixels and never clicks anything. It builds workflows atomically, forks the process into a private scenario to experiment, simulates thousands of cases, and returns a **reviewable diff** that the human merges or rejects. The human can set **policy locks** that the agent is structurally unable to violate. There is no chatbot inside ProcessTwin — ChatGPT/Codex is the intelligence, ProcessTwin is the capability surface.

**The pitch line for Devpost and the video:**

> Pull requests for application state. The agent branches, experiments, and proposes; the human reviews a diff and merges.

**Why this is a strong WebMCP fit (say this explicitly in the submission):** node-graph editors are close to the worst case for pixel- and DOM-driven agents. "Connect the decision node's false branch to Manager Approval and set the condition to amount > 2000" is one semantic operation and roughly a dozen fragile drag-and-click interactions. WebMCP lets the page publish the semantic operation directly. That gap is the entire argument, and it is visible on screen in under ten seconds.

---

## 2. The demo script — build backwards from this

This is the specification's true north. **If a feature does not appear in this script, it is not in scope.** Video must be under 3 minutes with audio, public on YouTube.

| Time | On screen | Tools called |
|---|---|---|
| 0:00–0:15 | Empty canvas. Right rail shows **13 tools registered**. Voiceover: "No chatbot here. Everything the agent does, it does through tools this page publishes." | — |
| 0:15–0:50 | Prompt 1 (build). Nine nodes and eleven edges fade in, agent-authored nodes tinted. Efficiency badge: **3 tool calls · ~70 UI interactions avoided**. | `get_process_summary`, `batch_mutate_process`, `auto_layout` |
| 0:50–1:10 | Human drags a node, opens inspector, changes Manager Approval from 25/60/150 to 240/360/480 min. Then asks the agent "what did I change?" Agent answers correctly. | `get_changes_since` |
| 1:10–1:45 | Prompt 2 (analyse). Simulation panel fills. Tool count ticks **14 → 15** as `analyze_bottlenecks` registers itself. Manager Approval flagged. | `validate_process`, `simulate_process`, `analyze_bottlenecks` |
| 1:45–2:25 | Prompt 3 (optimise). Agent forks a scenario. **It tries to delete Manager Approval and is rejected by a policy lock the human set earlier.** It adapts, then requests a merge. Diff drawer opens. Human clicks Apply. | `fork_scenario`, `batch_mutate_process(scenarioId)` → `POLICY_VIOLATION`, retry, `compare_scenarios`, `request_merge` |
| 2:25–2:50 | Re-simulate State B versus State C. Before/after table shows P95 collapsing from the human-edited baseline to the optimised scenario. | `simulate_process` |
| 2:50–3:00 | Architecture card: one command layer, two interfaces, N tools, 0 lines of DOM automation. | — |

**The single best ten seconds in this video is the policy-lock rejection.** An app that *governs* its agent is something almost no other submission will have, and it speaks directly to what the challenge sponsors have said they care about — an agent knowing what is safe to do and when to check back with a human. Do not cut it.

Tool registration is state-dependent: 13 core tools are available at cold start, `fork_scenario` brings the count to 14 once a process has a node, and a successful simulation brings it to 15 by registering `analyze_bottlenecks`. An open scenario adds `compare_scenarios`, `request_merge`, and `discard_scenario` (18 total); a pending merge adds `get_merge_status` (19 total).

---

## 3. Scope

### Build
Canvas + 5 node types · command layer with policy enforcement · scenario branching · validation · Monte Carlo simulation with queueing · bottleneck scoring · WebMCP layer with dynamic registration · diff/merge drawer · activity feed · agent telemetry panel · undo/redo · one seeded template · localStorage persistence.

### Do not build
Auth, accounts, teams, billing, backend, database, in-app chatbot, prompt history, multiple workspaces, realtime multiplayer, mobile layout, Playwright, React Testing Library, Web Workers, import/export, more than one template, a marketing landing page beyond a single hero screen with two buttons.

### Cut lines, in the order you cut them if you are behind
1. Second and third templates (already cut)
2. Undo/redo for scenarios (keep it for the main process only)
3. Cost modelling (keep duration only)
4. `ask_human` (§11.14) — highest-risk feature, first to go
5. Animations beyond a simple fade-in

---

## 4. Stack

Next.js App Router · TypeScript strict · React 18 · Tailwind · `@xyflow/react` · Zustand (with `immer`) · Zod · `dagre` · `lucide-react` · Vitest only.

**Local development is fully sufficient.** `document.modelContext` is SecureContext-only, but `http://localhost:3000` qualifies as a secure context, so agents can call your tools against the dev server. You do not need a deployment until you are ready to submit. When you are, Vercel (§21).

---

## 5. Domain model

`/src/types/process.ts`

```ts
export type StepType = 'start' | 'action' | 'decision' | 'approval' | 'end';
export type Actor = 'human' | 'agent' | 'system';

export interface Duration { minMinutes: number; typicalMinutes: number; maxMinutes: number }

export interface ProcessStep {
  id: string;
  type: StepType;
  name: string;
  description?: string;
  owner?: string;
  duration: Duration;              // {0,0,0} for start/end/decision
  cost?: number;
  capacityPerHour?: number;        // omit ⇒ infinite capacity, no queueing
  position: { x: number; y: number };
  createdBy: Actor;
  updatedAt: string;
}

export type Operator = 'eq'|'neq'|'gt'|'gte'|'lt'|'lte';

export interface ProcessConnection {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: { variable: string; operator: Operator; value: number | boolean | string };
  probability?: number;            // used when no condition matches
  createdBy: Actor;
}

// Case variables — sampled once per simulated case, then used by edge conditions.
export type VariableSpec =
  | { key: string; label: string; kind: 'number'; dist: 'triangular'; min: number; typical: number; max: number }
  | { key: string; label: string; kind: 'boolean'; probability: number }
  | { key: string; label: string; kind: 'constant'; value: number };

export interface ProcessPolicy {
  id: string;
  label: string;                   // human-readable, shown on the node and to the agent
  createdBy: Actor;
  rule:
    | { kind: 'lock_step'; stepId: string; lockedFields: (keyof ProcessStep)[] }
    | { kind: 'no_delete'; stepId: string }
    | { kind: 'require_step_on_path'; whenVariable: string; operator: Operator; value: number; requiredStepType: StepType };
}

export interface BusinessProcess {
  id: string;
  name: string;
  nodes: ProcessStep[];
  edges: ProcessConnection[];
  variables: VariableSpec[];
  policies: ProcessPolicy[];
  arrivalRatePerHour: number;      // process-level; drives queueing
  createdAt: string;
  updatedAt: string;
}
```

**`stateVersion`** is a monotonically increasing integer on the store, bumped by every committed mutation. It is returned by every tool. It is how the agent detects that the human moved.

---

## 6. Command layer — the architectural rule

`/src/domain/commands/`

> Every mutation, from either interface, goes through exactly one command function. There is no WebMCP-only code path and no UI-only code path.

Each command runs this pipeline, in order:

1. **Zod parse** the input → `INVALID_INPUT` with the Zod issue list on failure
2. **Referential checks** → `STEP_NOT_FOUND`, `DUPLICATE_EDGE`, `SELF_LOOP`, `END_HAS_OUTGOING`
3. **Limit checks** (§14) → `LIMIT_EXCEEDED`
4. **Policy check** → `POLICY_VIOLATION` for agent callers; a dismissible warning toast for human callers
5. **Apply** via immer
6. **Bump `stateVersion`**, push undo snapshot, append a change record to the delta log
7. **Append activity event**
8. **Return** `CommandResult`

Policy asymmetry is deliberate and is worth one line in the README: the human set the constraint, so the human may override it; the agent may not. That is the point.

The delta log is a ring buffer of the last 200 change records: `{ version, actor, kind, entityIds, summary, before?, after? }`. `get_changes_since` reads it.

---

## 7. Scenario branching

`/src/domain/scenarios/`

```ts
interface Scenario {
  id: string;
  title: string;
  reason: string;
  createdBy: Actor;
  baseVersion: number;             // stateVersion of main at fork time
  process: BusinessProcess;        // deep clone, mutated independently
  status: 'open' | 'merged' | 'rejected' | 'stale';
  simulation?: SimulationResult;
}
```

- `forkScenario(title, reason)` deep-clones main and returns an id.
- All mutation commands take an optional `scenarioId`. With it, they mutate the scenario's clone; without it, main. **Same command functions.** This is what makes branching nearly free to build.
- `diffScenario(id)` returns structured changes:
  ```ts
  { added: ProcessStep[]; removed: ProcessStep[];
    modified: Array<{ stepId: string; field: string; before: unknown; after: unknown }>;
    edgesAdded: ProcessConnection[]; edgesRemoved: ProcessConnection[];
    edgesModified: Array<{ edgeId: string; before: ProcessConnection; after: ProcessConnection;
      changedFields: Array<'source'|'target'|'label'|'condition'|'probability'> }>;
    policyConflicts: Array<{ policyId: string; label: string }> }
  ```
- A scenario becomes `stale` if main's `stateVersion` moves past `baseVersion`. Show this in the drawer; the agent learns it from `get_merge_status`.
- `mergeScenario(id)` replaces main's nodes/edges with the scenario's, as **one** undo entry. Only callable from the UI button by default (see §11.13).

Canvas shows the scenario when one is active, with a coloured border and a "Scenario: <title> — viewing branch" bar. Toggling back to main is one click.

---

## 8. Simulation engine — read this section carefully

`/src/domain/simulation/`

Seeded PRNG (mulberry32). Same seed ⇒ byte-identical results. This is snapshot-tested.

### Per case
```
sample all case variables (once)
cursor = start node
while cursor is not an end node and visits < 100:
    duration = sampleTriangular(node) + queueWait(node)
    total += duration; cost += node.cost
    record visit
    cursor = selectNextEdge(cursor)
```

`selectNextEdge`: evaluate outgoing edges in array order; the first whose `condition` matches the sampled case variables wins. If none has a condition, choose by normalised `probability`. If neither, uniform random. If there are no outgoing edges and it is not an `end` node, mark the case failed and record a `DEAD_END` at that node.

### Queueing — do not skip this
**The original guide's simulation was structurally unable to demonstrate its own optimization story.** With pure triangular sampling, changing a step's `capacityPerHour` changes nothing at all, so "the agent doubled manager capacity and P95 fell" is not something the engine can produce. Fix it with an M/M/1 wait approximation:

```
λ_step = process.arrivalRatePerHour × visitRate(step)
ρ      = min(λ_step / step.capacityPerHour, 0.95)      // cap to avoid divergence
Wq     = (ρ / (1 − ρ)) × step.typicalMinutes           // mean queue wait
queueWait(step) = sampleExponential(mean = Wq)
```

Steps with no `capacityPerHour` get `queueWait = 0`.

This needs `visitRate`, which needs a simulation — so run **two passes**: pass one with `queueWait = 0` to measure visit rates, then compute ρ and Wq per step, then pass two for the real numbers. Two passes of 10k cases is still well under 300 ms in plain JS. Do not build a Web Worker until you have measured and found it slow.

### Validated constants for the refund template

I ran the model. These produce a clean, causally correct three-state story:

| State | Manager Approval | Capacity | Above-threshold share | P50 | P95 | ρ | Queue |
|---|---|---|---|---|---|---|---|
| A — as agent builds it | 25/60/150 min | 5/hr | 42% | 1.44h | 4.25h | 0.41 | 41 min |
| B — after human edits to 360 | 240/360/480 min | 5/hr | 42% | 1.44h | 15.90h | 0.41 | 247 min |
| C — after agent optimises | 25/60/150 min | 10/hr | 18% | 1.19h | 3.09h | 0.09 | 6 min |

Other constants: `arrivalRatePerHour = 5`, fraud probability 3%, investigation 60/150/360, receive request 5/15/35, fraud check 2/5/15, amount check 1/3/8, auto-approve 1/2/6, issue refund 10/25/70.

State B at ~16h is dramatic but slightly absurd on screen. If you want it nearer 8h, drop manager typical to ~200 min or the above-threshold share to ~30%. **Then lock whatever you choose with a golden snapshot test** so a later refactor cannot silently change your demo numbers.

### Result shape
Per the earlier guide's `SimulationResult`, plus per-step `queueWaitMinutes` and `utilization`, and a `warnings: string[]` for saturated steps (ρ ≥ 0.9).

### Bottleneck score
```
score = 0.40 × normalisedTotalTimeShare
      + 0.30 × normalisedAverageDuration
      + 0.30 × utilization
```
Return `reasons: string[]` in plain English — "consumes 38% of total cycle time", "estimated 92% utilisation", "average queue wait 247 minutes". The agent reads these verbatim into its explanation, which makes the demo narration sound sharp for free.

---

## 9. Validation

Deterministic, no LLM. Errors: no start / multiple starts / no end / dangling edge reference / unreachable node / decision with fewer than two outgoing edges / probabilities on one source summing outside 0.99–1.01 / end node with outgoing edges. Warnings: missing owner on approval / zero duration on action / capacity missing on approval / step with no path to any end / potential infinite loop. Suggestions: unowned steps, uncosted steps.

Every issue carries `{ code, severity, message, entityIds, suggestedFix? }`. `suggestedFix` is the difference between an agent that guesses and an agent that self-corrects on camera.

---

## 10. The WebMCP layer

`/src/webmcp/`

### Registration — use the current API

```ts
// src/webmcp/register.ts
import type { ToolDef } from './types';

export function registerTools(tools: ToolDef[], signal: AbortSignal) {
  if (typeof document === 'undefined' || !('modelContext' in document)) return;
  const mc = (document as any).modelContext;

  for (const t of tools) {
    mc.registerTool({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,          // JSON Schema, generated from Zod via zod-to-json-schema
      annotations: t.annotations,          // { readOnlyHint, destructiveHint, idempotentHint }
      execute: async (input: unknown) => {
        const envelope = await t.run(input);
        telemetry.record(t.name, envelope);
        return { content: [{ type: 'text', text: JSON.stringify(envelope) }] };
      },
    });
  }

  signal.addEventListener('abort', () => {
    for (const t of tools) { try { mc.unregisterTool(t.name); } catch {} });
  });
}
```

Notes that will save you an hour each:
- The getter moved from `navigator` to `document` in the May 2026 draft. `navigator.modelContext` still works but logs a deprecation warning in Chromium 150+. **The Devpost rules literally show `document.modelContext.registerTool` as expected repo content** — use it.
- `SecureContext` only. Localhost counts as secure; a plain-HTTP preview URL does not.
- Register inside a `useEffect` in a client component, tied to an `AbortController`, so tools follow the page lifecycle.
- Generate `inputSchema` from your Zod schemas rather than hand-writing JSON Schema twice — they will drift otherwise.

### Dynamic registration — this is a scoring feature

Maintain the registered set as a function of app state, and re-reconcile whenever the relevant state changes:

| Tool | Registered when |
|---|---|
| 13 core tools | always |
| `analyze_bottlenecks` | at least one simulation result exists |
| `fork_scenario` | process has ≥ 1 node |
| `compare_scenarios`, `request_merge`, `discard_scenario` | an open scenario exists |
| `get_merge_status` | a merge request is pending |

Reconciliation: diff desired names against registered names, `unregisterTool` the departures, `registerTool` the arrivals. Never re-register an unchanged tool — some implementations will throw on duplicate names.

The right rail shows the live list, so the count visibly ticks 13 → 14 → 15 during the demo, then 18 for an open scenario and 19 for a pending merge. Most submissions will register a static array in a `useEffect` and never call `unregisterTool` at all. This one line of differentiation is cheap and reads as genuine engineering.

### Result envelope — every tool returns this shape

```ts
interface ToolEnvelope<T> {
  ok: boolean;
  summary: string;        // one sentence of natural language; agents narrate this verbatim
  data?: T;
  error?: { code: string; message: string; details?: unknown; suggestion?: string };
  stateVersion: number;
  nextSteps?: string[];   // e.g. ["Call validate_process before simulating"]
}
```

`summary` and `nextSteps` are why the agent's narration sounds good on camera without you prompting for it. Keep them factual and first-party — never echo user-supplied text back in a way that could read as an instruction to the agent.

### Error codes
`INVALID_INPUT` · `STEP_NOT_FOUND` · `EDGE_NOT_FOUND` · `DUPLICATE_EDGE` · `SELF_LOOP` · `END_HAS_OUTGOING` · `POLICY_VIOLATION` · `LIMIT_EXCEEDED` · `BATCH_FAILED` · `SCENARIO_NOT_FOUND` · `SCENARIO_STALE` · `NO_SIMULATION` · `SIMULATION_FAILED`

**Errors must be recoverable without a second round trip.** `STEP_NOT_FOUND` returns the list of valid `{id, name}` pairs. `POLICY_VIOLATION` returns the policy label and a suggestion. `INVALID_INPUT` returns the specific failing field. This is what "skilful tool design" looks like to a judge reading your source.

---

## 11. Tool catalogue

19 tools are defined; 13 are active at cold start, with up to 19 registered as process and scenario state make them relevant. Descriptions must teach the agent how the product works — the difference between "Creates a node" and a real description is worth real points, and it is what makes the agent behave well unprompted.

**11.1 `get_process_summary`** — `readOnlyHint`. Input `{}`. Returns name, counts, start/end ids, a one-line summary per step (`id, type, name, owner, typicalMinutes, capacityPerHour`), active policy labels, validation status, latest simulation headline, `stateVersion`.
> *"Returns a compact overview of the process currently open in ProcessTwin — every step with its id, type, timing and owner, plus active policy constraints and the latest simulation headline. Call this first. It is much cheaper than get_process_graph and is sufficient for most reasoning."*

**11.2 `get_process_graph`** — `readOnlyHint`. Input `{ stepIds?: string[], depth?: number }`. Full graph, or the subgraph around given steps. Prevents the whole-graph-every-turn token trap.

**11.3 `get_changes_since`** — `readOnlyHint`. Input `{ sinceVersion: number }`. Returns ordered change records with `actor`, so the agent can say "you changed Manager Approval's typical duration from 60 to 360 minutes." **This is the collaboration proof and the reason the 0:50 beat in the video works.** WebMCP has no push channel (`provideContext` was removed from the spec in March 2026), so a version cursor is the correct substitute.

**11.4 `batch_mutate_process`** — the primary build tool. Input `{ scenarioId?: string, operations: Op[] }` where `Op` is a discriminated union of `create_step | update_step | delete_step | connect_steps | update_connection | delete_connection | set_variable`. `create_step` accepts a `tempId` usable as `sourceId`/`targetId` later in the same batch. **Atomic**: validate every operation against a simulated clone first; if any fails, apply nothing and return `BATCH_FAILED` with the index and reason of the first failure. One undo entry, one activity entry for the whole batch.
> *"Applies multiple process changes in a single atomic transaction. Use this to build or restructure a workflow — it is strongly preferred over repeated single-step calls. Reference steps created earlier in the same batch by their tempId. If any operation is invalid the entire batch is rejected and nothing changes, so you can retry safely."*

**11.5–11.9 `create_step`, `update_step`, `connect_steps`, `update_connection`, `delete_step`** — single-operation tools for small corrections. Each accepts optional `scenarioId`. Descriptions should steer bulk work to `batch_mutate_process`: *"For small corrections to an existing workflow. To build or restructure several steps, use batch_mutate_process instead."* `create_step` assigns canvas position automatically — never make the agent reason about x/y. `delete_step` cascades edges and reports what it removed.

**11.10 `validate_process`** — `readOnlyHint`. Input `{ scenarioId? }`. Full structured validation with `suggestedFix`.

**11.11 `simulate_process`** — `readOnlyHint` (does not change the process; does populate the results panel). Input `{ iterations?: 100–50000 default 5000, seed?: number, scenarioId?: string }`. Registers `analyze_bottlenecks` on first success.

**11.12 `analyze_bottlenecks`** — *conditionally registered*. Input `{ scenarioId?, top?: number }`. Ordered bottlenecks with plain-English `reasons`.

**11.13 Scenario tools** — `fork_scenario { title, reason }` · `compare_scenarios { scenarioId }` (returns the diff plus a simulated before/after metric table) · `request_merge { scenarioId, summary }` (opens the drawer; returns `{ status: 'awaiting_human' }` — **does not merge**) · `get_merge_status { scenarioId }` · `discard_scenario { scenarioId }`.

There is no `apply_scenario` tool. **The merge button belongs to the human.** State this in the README as a deliberate design decision, not an omission — it is the strongest sentence in your submission.

**11.14 `ask_human`** — *optional, highest risk, first to cut.* Input `{ question: string, options?: string[] }`. Renders a card in the activity feed; `execute` returns a promise that resolves when the human clicks. Timeout at 90 s returning `{ status: 'timeout', pendingId }`, with a `check_human_response` companion. If it works it is the most novel thing in the whole submission — genuine bidirectional collaboration through the page. If it hangs during a take, cut it and move on.

**11.15 `list_policies`** — `readOnlyHint`. Returns active constraints so the agent can plan within them instead of discovering them by rejection. Keep it registered — but the video is better if the agent hits the rejection first, so do not have the agent call this in the optimise prompt.

---

## 12. UI

Workspace layout: header (name, undo/redo, scenario switcher, Simulate) · left palette · centre canvas · right rail · bottom drawer with tabs Activity / Simulation / Validation / **Agent**.

**Right rail** is context-sensitive: node inspector when a node is selected, otherwise the WebMCP status panel (support detected, live tool list, per-tool call counts).

**Agent tab / telemetry panel** — this is how you *show the benefit*, which is what the judges are asked to score:

```
WebMCP session
Tools registered      15        Tool calls          7
Payload returned      4.1 KB    ≈ tokens            1,050
UI interactions avoided          ≈ 34
```

Compute "interactions avoided" honestly from a fixed cost table (create node = 3: drag, name, confirm; connect = 2; set condition = 4; edit field = 2; layout = 1) and label it *estimated*. A judge who sees "1 tool call replaced ~28 interactions" understands WebMCP's value proposition instantly, and you never had to argue it.

**Activity feed**: actor avatar, action, entity, timestamp, per-entry Undo button. Batch entries collapse — "✨ Agent built workflow · 9 steps · 11 connections" with an expander.

**Diff drawer**: title, reason, `+ / ~ / −` change list, before/after metric table, policy-conflict warnings if any, `Reject` and `Apply changes`.

**Policy chips**: a small lock icon on constrained nodes; clicking opens a popover with the policy label and an Unlock action.

**Visual direction**: restrained and professional — Linear/Vercel register. Subtle grid canvas, rounded panels, minimal shadow, strong type. Node colours: start neutral-green, action blue, decision amber, approval purple, end dark. Agent-created nodes fade+scale in over 250 ms with a brief ring; agent-edited nodes flash an outline. Nothing else animates.

**Empty state**: "Build your first process" plus the three demo prompts as copy buttons. Judges will click these. Make them exact (§16).

---

## 13. Safety and limits

100 nodes · 250 edges · 50,000 iterations · 100 batch operations · 100 visits per simulated case · 5 open scenarios · 90 s `ask_human` timeout. Every limit returns `LIMIT_EXCEEDED` with the limit and the attempted value.

Destructive operations (`delete_step` on a node with >2 edges, `discard_scenario`) return a confirmation requirement rather than executing when called with `confirm: false`, which is the default. Merge is human-only by construction.

Graceful degradation: if `document.modelContext` is absent, the app works fully and the right rail shows *"WebMCP not detected — ProcessTwin works normally. Open in ChatGPT's desktop in-app browser, or Chrome 149+ with chrome://flags/#enable-webmcp-testing, to collaborate with an agent."*

---

## 14. Tests — Vitest only, roughly 20 assertions

Simulation: same seed ⇒ identical output · percentiles correct on a known array · queue wait rises with utilisation · capacity increase lowers P95 (this test is the one that proves §8 works) · loops terminate at the visit cap · golden snapshot of the refund template's three states.

Commands: delete cascades edges · undo restores exactly · batch is atomic (a failing op at index 3 leaves state untouched) · policy blocks agent, warns human.

Scenarios: fork does not mutate main · scenario mutation does not touch main · merge is one undo entry · main moving marks the scenario stale.

WebMCP: tool names unique · desired-set reconciliation registers and unregisters correctly · absent `modelContext` does not throw.

`npm run verify` = `tsc --noEmit && vitest run && next build`.

---

## 15. File tree

```
processtwin/
├── AGENTS.md  PROCESS.md  README.md  LICENSE (MIT)
├── app/  page.tsx  workspace/page.tsx  layout.tsx  globals.css
└── src/
    ├── components/  canvas/  inspector/  activity/  simulation/
    │                validation/  scenario/  webmcp-panel/  ui/
    ├── domain/  commands/  policies/  scenarios/  simulation/
    │            validation/  layout/  telemetry/
    ├── stores/  process-store.ts  scenario-store.ts  activity-store.ts
    │            ui-store.ts  telemetry-store.ts
    ├── webmcp/  register.ts  reconcile.ts  schemas.ts  envelope.ts  tools/
    ├── hooks/  use-webmcp.ts
    ├── data/  templates/refund.ts
    └── types/  process.ts  simulation.ts  webmcp.d.ts
```

---

## 16. Demo prompts — ship these verbatim in the empty state

**Build**
> Build a refund workflow. Every request goes through a fraud check. Fraud-flagged requests go to investigation. Clean requests under $500 are auto-approved; $500 and above need manager approval. All successful paths issue the refund before ending. Then lay it out and validate it.

**Analyse**
> What has changed since you last looked? Then simulate 10,000 cases with seed 42 and tell me which step drives our P95.

**Optimise**
> Propose changes that bring P95 below four hours. Refunds above $2,000 must still require human approval. Work in a scenario and show me the diff before anything changes.

---

## 17. Phases

| Phase | Build | Gate — do not proceed until |
|---|---|---|
| **0 (30 min)** | Scaffold Next.js. One page, one `document.modelContext.registerTool`. Run `npm run dev` and verify an agent calls it at `http://localhost:3000` — in Chrome 149+ with `chrome://flags/#enable-webmcp-testing`, and in the ChatGPT desktop in-app browser if it will reach localhost. | An agent has successfully called your tool. **Write no ProcessTwin code until this passes.** |
| **1** | Types, stores, command layer, policy engine, persistence, workspace shell | Blank workspace loads and survives a reload |
| **2** | Canvas, 5 node types, inspector, connect/delete, dagre layout, undo/redo, activity feed | A human can build the refund workflow by hand |
| **3** | WebMCP layer: envelope, registration, reconciliation, tools 11.1–11.9 | An agent builds the full workflow from an empty canvas in one `batch_mutate_process` |
| **4** | Validation + simulation + bottlenecks + tools 11.10–11.12 + results UI | Capacity test passes; three-state numbers match §8 |
| **5** | Scenarios, diff, merge drawer, tools 11.13; telemetry panel | Agent forks, is blocked by a policy, adapts, and requests a merge |
| **6** | Polish, empty state, animations, README, architecture diagram, `ask_human` if time | Full demo script runs end to end twice without a stumble |
| **7** | Push to GitHub, deploy to Vercel, re-verify on the deployed origin, record video, Devpost write-up | Submitted, with margin |

Phase 0 is not optional and is not a formality. If the browser does not surface your tools, nothing downstream matters, and thirty minutes spent finding that out first is the cheapest half-hour in the project.

---

## 18. `AGENTS.md`

Ships as its own file in the project root. Codex loads it automatically on every turn — it holds the standing rules (architecture boundaries, forbidden patterns, verify command) that must apply regardless of which phase prompt you are running. Do not paste its contents into prompts; it is already in context.

---

## 19. Submission checklist

- [ ] Public repo, **MIT LICENSE detectable in the GitHub About panel** (an explicit rule requirement)
- [ ] Dated commit history spanning the submission window
- [ ] Live HTTPS URL, no auth, works in ChatGPT desktop in-app browser and Chrome 149+ with the flag
- [ ] YouTube video, public, **under 3:00**, with audio covering what you built and how you used WebMCP
- [ ] Devpost text covering all four required points: why WebMCP fits, how it improves UX, what humans and agents can now do together that was hard before, how you implemented it
- [ ] README with the architecture diagram, full tool catalogue, and the demo prompts
- [ ] Submitted by **Sep 3, 1:00 pm PDT**

---

## 20. Devpost description — opening draft

> **ProcessTwin is pull requests for application state.**
>
> Node-graph editors are close to the worst case for browser agents. "Connect the decision's false branch to Manager Approval and set the condition to amount > 2000" is one idea and about a dozen fragile drags and clicks. ProcessTwin publishes the idea directly as a WebMCP tool, so the agent and the human operate the same process through different interfaces — and every mutation from both sides runs through one command layer, so they can never disagree about what the state is.
>
> The agent does not edit your live workflow. It forks a scenario, experiments inside it, simulates 10,000 cases, and hands back a diff. You merge it. There is no `apply_scenario` tool, on purpose — the merge button belongs to the human.
>
> And you can lock the agent out of things. Set a policy — "refunds above $2,000 always require human approval" — and every agent mutation that would violate it is rejected at the command layer with a structured error explaining why. The agent reads the reason and adapts. That is what an agent-native app should feel like: not an agent that can do anything, but an app that knows what it will let an agent do.
>
> 19 WebMCP tools, registered and unregistered dynamically as application state changes. Zero lines of DOM automation.

---

## 21. Local → GitHub → Vercel

Everything up to Phase 6 runs on `http://localhost:3000`. When the demo script in §2 runs end to end twice without stumbling:

```bash
npx vercel --prod
```

The repo is already public and current — Codex has been pushing after every phase.

Then re-verify on the deployed origin before recording — a tool that registers on localhost can still fail on a production build (client/server boundary mistakes surface here, not in dev). Open the Vercel URL in Chrome 149+ with the flag and in the ChatGPT desktop in-app browser, and run all three demo prompts against it.

Confirm GitHub's About panel shows "MIT license". The rules require the license to be detectable there, and a `LICENSE` file with the wrong name or a non-standard header will not trigger it.
