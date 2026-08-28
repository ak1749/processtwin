import { z } from 'zod';

import { simulateProcess } from '../simulation/simulate';
import { useProcessStore } from '../../stores/process-store';
import { useSimulationStore } from '../../stores/simulation-store';
import { getScenario } from '../scenarios';
import { useScenarioStore } from '../../stores/scenario-store';
import type { SimulationResult } from '../../types/simulation';
import type { CommandContext, CommandResult } from './types';

const runSimulationSchema = z.object({
  iterations: z.number().int().min(100).max(50_000).default(5_000),
  seed: z.number().int().default(42),
}).strict();

export function runSimulation(ctx: CommandContext, input: unknown): CommandResult<SimulationResult> {
  const store = useProcessStore.getState();
  const parsed = runSimulationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, stateVersion: store.stateVersion, error: { code: 'INVALID_INPUT', message: 'The command input is invalid.', details: parsed.error.issues } };
  const scenario = ctx.scenarioId ? getScenario(ctx.scenarioId) : undefined;
  if (ctx.scenarioId && !scenario) return { ok: false, stateVersion: store.stateVersion, error: { code: 'SCENARIO_NOT_FOUND', message: `No scenario exists with id ${ctx.scenarioId}.` } };
  const result = simulateProcess(scenario?.process ?? store.process, parsed.data);
  if (scenario) useScenarioStore.getState().setScenarioSimulation(scenario.id, result);
  else useSimulationStore.getState().setResult(result);
  return { ok: true, stateVersion: store.stateVersion, data: result };
}
