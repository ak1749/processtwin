# ProcessTwin

> Pull requests for application state. The agent branches, experiments, and proposes; the human reviews a diff and merges.

ProcessTwin is a visual business-process simulator. A person works on the node canvas while an AI agent works on the same state through WebMCP tools exposed by the page. The agent never needs to see pixels or perform fragile drag-and-click automation.

## Why WebMCP

Node-graph editing is a poor fit for pixel-driven agents: connecting a decision branch and setting a condition is one semantic request but many brittle UI actions. ProcessTwin publishes that semantic operation directly. The agent can atomically build a workflow, create a private scenario, simulate it, and return a reviewable diff for the human to merge.

## Architecture

Every mutation travels through one command layer. The canvas and WebMCP tools are different interfaces to the same process state.

```text
Human UI action  ──┐
                   ├──▶ src/domain/commands/* ──▶ Zustand store
WebMCP tool call ──┘
```

## WebMCP tool catalogue

| Tool | Purpose | Conditionally registered? |
| --- | --- | --- |
| `get_process_summary` | Compact overview of the open process, its steps, policies, validation, and simulation headline. | No |
| `get_process_graph` | Full process graph or a focused subgraph around selected steps. | No |
| `get_changes_since` | Ordered change log from a state-version cursor, including the actor. | No |
| `batch_mutate_process` | Applies a set of process mutations atomically; preferred for building or restructuring. | No |
| `create_step` | Creates one step for a small correction. | No |
| `update_step` | Updates one step for a small correction. | No |
| `connect_steps` | Connects two existing steps. | No |
| `update_connection` | Updates one existing connection. | No |
| `delete_step` | Deletes a step and cascades its connections where confirmed. | No |
| `validate_process` | Returns structured workflow validation and suggested fixes. | No |
| `simulate_process` | Simulates the process and fills the results panel. | No |
| `list_policies` | Returns active policy constraints for planning. | No |
| `analyze_bottlenecks` | Ranks bottlenecks with plain-English reasons. | Yes — after a successful simulation |
| `fork_scenario` | Creates a private scenario from the live workflow. | Yes — once the process has at least one step |
| `compare_scenarios` | Returns a scenario diff and before/after metrics. | Yes — while an open scenario exists |
| `request_merge` | Opens a human review request for a scenario; it never merges automatically. | Yes — while an open scenario exists |
| `get_merge_status` | Returns the status of a pending merge request. | Yes — after a merge request |
| `discard_scenario` | Discards an open scenario after confirmation. | Yes — while an open scenario exists |

## Demo prompts

**Build**

> Build a refund workflow. Every request goes through a fraud check. Fraud-flagged requests go to investigation. Clean requests under $500 are auto-approved; $500 and above need manager approval. All successful paths issue the refund before ending. Then lay it out and validate it.

**Analyse**

> What has changed since you last looked? Then simulate 10,000 cases with seed 42 and tell me which step drives our P95.

**Optimise**

> Propose changes that bring P95 below four hours. Refunds above $2,000 must still require human approval. Work in a scenario and show me the diff before anything changes.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Open demo** to load the refund template, or **Start blank** to begin from an empty canvas.

Run the complete verification suite with:

```bash
npm run verify
```

## Testing WebMCP

`localhost` is a secure context for WebMCP. Open the workspace in ChatGPT's desktop in-app browser, or Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled. The right rail reports whether WebMCP is detected and lists the tools the page successfully registered. If it is unavailable, ProcessTwin remains fully usable as a normal canvas editor.

## Design decisions

- Both interfaces use one command layer, so policy checks, undo history, activity entries, and process state cannot diverge.
- There is intentionally no `apply_scenario` tool. A scenario can only be merged from the human review UI.
- Policy enforcement is asymmetric: the human who set a policy can override it after a warning; an agent receives a structured rejection and must adapt its plan.

## License

[MIT](LICENSE)
