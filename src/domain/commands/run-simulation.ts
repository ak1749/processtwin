import { z } from 'zod';

import { simulateProcess } from '../simulation/simulate';
import { useProcessStore } from '../../stores/process-store';
import { useSimulationStore } from '../../stores/simulation-store';
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
  if (ctx.scenarioId) return { ok: false, stateVersion: store.stateVersion, error: { code: 'SCENARIO_NOT_FOUND', message: 'Scenario simulation is available in a later phase.', suggestion: 'Retry without scenarioId against the current process.' } };
  const result = simulateProcess(store.process, parsed.data);
  useSimulationStore.getState().setResult(result);
  return { ok: true, stateVersion: store.stateVersion, data: result };
}
