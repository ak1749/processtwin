import { diffScenario } from '../../domain/scenarios';
import { simulateProcess } from '../../domain/simulation/simulate';
import { discardProcessScenario, forkProcessScenario, requestScenarioMerge, scenarioMergeStatus } from '../../domain/commands/scenario-commands';
import { useProcessStore } from '../../stores/process-store';
import { getScenario } from '../../domain/scenarios';
import { commandEnvelope, invalidInputEnvelope } from './shared';
import { discardScenarioInputSchema, forkScenarioInputSchema, jsonSchema, requestMergeInputSchema, scenarioToolInputSchema } from '../schemas';
import type { ToolDef } from '../types';

export const forkScenarioTool: ToolDef = { name: 'fork_scenario', description: 'Creates a private scenario branch from the current main process. Make proposed changes with its scenarioId; main remains untouched until a human applies the reviewed diff.', inputSchema: jsonSchema(forkScenarioInputSchema), run: (input) => commandEnvelope(forkProcessScenario({ actor: 'agent' }, input), 'Created a private scenario branch.') };

export const compareScenariosTool: ToolDef = { name: 'compare_scenarios', description: 'Compares one scenario with main. It runs both simulations with the same seed and returns structural changes plus before-and-after cycle-time metrics for human review.', inputSchema: jsonSchema(scenarioToolInputSchema), annotations: { readOnlyHint: true }, run: (input) => {
  const parsed = scenarioToolInputSchema.safeParse(input);
  if (!parsed.success) return invalidInputEnvelope(parsed.error.issues);
  const scenario = getScenario(parsed.data.scenarioId);
  const state = useProcessStore.getState();
  if (!scenario) return { ok: false, summary: 'The requested scenario does not exist.', error: { code: 'SCENARIO_NOT_FOUND', message: `No scenario exists with id ${parsed.data.scenarioId}.` }, stateVersion: state.stateVersion };
  const seed = 42;
  const before = simulateProcess(state.process, { iterations: 5000, seed });
  const after = simulateProcess(scenario.process, { iterations: 5000, seed });
  return { ok: true, summary: 'Compared the scenario with main using the same simulation seed.', data: { diff: diffScenario(scenario.id), metrics: { seed, before, after } }, stateVersion: state.stateVersion };
} };

export const requestMergeTool: ToolDef = { name: 'request_merge', description: 'Requests human review of a scenario. This opens the diff drawer and returns awaiting_human; it never applies the scenario.', inputSchema: jsonSchema(requestMergeInputSchema), run: (input) => {
  const parsed = requestMergeInputSchema.safeParse(input);
  if (!parsed.success) return invalidInputEnvelope(parsed.error.issues);
  return commandEnvelope(requestScenarioMerge({ actor: 'agent' }, { scenarioId: parsed.data.scenarioId }), 'Merge request is awaiting human review.');
} };

export const getMergeStatusTool: ToolDef = { name: 'get_merge_status', description: 'Returns whether a scenario is awaiting human review, merged, rejected, or stale relative to the main process version.', inputSchema: jsonSchema(scenarioToolInputSchema), annotations: { readOnlyHint: true }, run: (input) => commandEnvelope(scenarioMergeStatus(input), 'Returned the scenario merge status.') };

export const discardScenarioTool: ToolDef = { name: 'discard_scenario', description: 'Discards a private scenario without changing main. Set confirm true after reviewing the branch because this is destructive.', inputSchema: jsonSchema(discardScenarioInputSchema), annotations: { destructiveHint: true }, run: (input) => commandEnvelope(discardProcessScenario({ actor: 'agent' }, input), 'Discarded the private scenario.') };
