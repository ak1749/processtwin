# ProcessTwin — Pull Requests for Application State

## One-line Summary

A WebMCP-powered business-process simulator where people and AI agents co-design, test, and govern workflows on the same application state.

## Problem

Business-process editors are hostile to pixel- and DOM-driven agents. A request such as connecting a decision's false branch to Manager Approval and applying a condition can require many fragile drags, clicks, and inspector edits. Small visual mistakes can silently create the wrong workflow.

## Solution

ProcessTwin exposes the process editor's semantic operations as WebMCP tools. A human works directly on a visual node canvas while an agent operates on the exact same process state through the page's tools. The agent can build or inspect a workflow, simulate thousands of cases, identify bottlenecks, propose an optimisation in a private scenario, and return a reviewable diff. The human remains the only actor who can merge that scenario.

## Why This Matters

This makes agent assistance reliable in a domain where coordinate-driven automation is particularly brittle. Rather than guessing from pixels, the agent receives structured process graphs, validation results, simulation metrics, policy constraints, and recoverable errors. People gain a collaborator that can experiment safely without taking irreversible action; agents gain a capability surface expressed in the domain's own vocabulary.

## How We Used AI

The product is designed for an external AI agent such as ChatGPT/Codex to operate through WebMCP rather than through an in-app chat interface. The agent uses structured tools to inspect changes, create and update process elements, simulate outcomes, analyse bottlenecks, and work within human-set policy constraints. Tool responses include a natural-language summary, structured data, state version, and suggested next steps so the agent can recover in one round trip.

## How We Used Codex

Codex was used as the coding agent during the build, including implementation, TypeScript/Vitest/Next.js verification, and in-app-browser WebMCP testing. The project records dated commit history throughout the challenge period. Codex is also a first-class testing client: the deployed app was opened in Codex's in-app browser, where all 13 core tools registered and `get_process_summary` returned a successful structured envelope.

## Key Features

- Semantic WebMCP operations for creating, connecting, editing, validating, simulating, and arranging workflow nodes.
- One command layer for human UI actions and agent tool calls, preventing state divergence.
- State-aware tool registration: 13 core tools, expanding to as many as 19 tools when simulation and scenario state make them relevant.
- Policy locks that reject unsafe agent mutations with structured explanations while allowing the human policy author to override with a warning.
- Private scenario branches with simulations, before/after diffs, and a human-only merge action.
- Seeded Monte Carlo simulation with capacity-aware queue waiting and ranked bottleneck analysis.
- Live agent telemetry for tool calls, payload size, and estimated UI interactions avoided.

## Architecture

Next.js App Router, TypeScript, React Flow, Zustand, Zod, dagre, and Vitest. Each page-registered tool is created with `document.modelContext.registerTool` under lifecycle cleanup. Zod is the source of truth for tool input validation and JSON Schema generation. Every mutation from either interface reaches exactly one command function in `src/domain/commands/`, which performs validation, referential and policy checks, state-version updates, undo/history updates, and activity logging.

## Testing Instructions

1. Open the live app in ChatGPT's in-app browser, or Chrome 149+ after enabling `chrome://flags/#enable-webmcp-testing` and restarting Chrome.
2. Open the workspace and choose **Open demo** to load the refund workflow.
3. Confirm the right rail reports WebMCP support and 13 core tools.
4. Ask the agent to run the README's Build, Analyse, and Optimise demo prompts.
5. In the optimisation prompt, retain the approval policy: the agent's attempt to remove Manager Approval should return a structured policy violation; it can then propose a compliant scenario. Review and merge the scenario from the human UI.
6. For local verification, run `npm install` followed by `npm run verify`.

## Public Demo Link

https://processtwin-beta.vercel.app

## Public Repository Link

https://github.com/ak1749/processtwin

## Demo Video

https://youtu.be/XFoOoyY01Tc

The public video is under three minutes and includes audio. It demonstrates tool registration, semantic workflow construction, human-authored change awareness, simulation and bottleneck analysis, policy rejection, and a human-only scenario merge.

## Screenshot Shot List

1. Empty canvas with the right rail reporting 13 registered WebMCP tools.
2. Populated refund workflow with agent-authored nodes and agent telemetry visible.
3. Simulation results and ranked Manager Approval bottleneck.
4. Policy-violation response when the agent tries to remove Manager Approval.
5. Scenario diff drawer with the human Apply control visible.

## Submission Readiness Notes

- Live URL and public repository are reachable.
- MIT license and runnable setup instructions are present in the repository.
- The description explicitly covers WebMCP fit, user-experience improvement, human-agent collaboration, and implementation.
- Dated commits within the challenge period document the WebMCP work.
- The Devpost entry, participant-specific form answers, and public YouTube demo were completed manually and verified live on September 2, 2026.

## Known Limitations

- WebMCP availability depends on a compatible browser context; the visual canvas remains usable when it is absent.
- There is intentionally no in-app chatbot and no agent-accessible scenario-merge tool. The human owns the final merge decision.
- The app has no backend; process data is local to the browser.

## TODO Official Form Fields

Completed manually in Devpost. Participant-specific answers are intentionally not duplicated here.
