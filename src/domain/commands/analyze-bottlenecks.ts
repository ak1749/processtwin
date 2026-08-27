import { z } from 'zod';

import { analyzeBottlenecks } from '../simulation/bottlenecks';
import { useProcessStore } from '../../stores/process-store';
import { useSimulationStore } from '../../stores/simulation-store';
import type { Bottleneck } from '../../types/simulation';
import type { CommandContext, CommandResult } from './types';

const analyzeBottlenecksSchema = z.object({ scenarioId: z.string().trim().min(1).optional(), top: z.number().int().min(1).max(100).optional() }).strict();

export function analyzeCurrentBottlenecks(ctx: CommandContext, input: unknown): CommandResult<Bottleneck[]> {
  const store = useProcessStore.getState();
  const parsed = analyzeBottlenecksSchema.safeParse(input);
  if (!parsed.success) return { ok: false, stateVersion: store.stateVersion, error: { code: 'INVALID_INPUT', message: 'The command input is invalid.', details: parsed.error.issues } };
  if (ctx.scenarioId ?? parsed.data.scenarioId) return { ok: false, stateVersion: store.stateVersion, error: { code: 'SCENARIO_NOT_FOUND', message: 'Scenario bottleneck analysis is available in a later phase.', suggestion: 'Retry without scenarioId against the current process.' } };
  const result = useSimulationStore.getState().result;
  if (!result) return { ok: false, stateVersion: store.stateVersion, error: { code: 'NO_SIMULATION', message: 'No simulation result is available yet.', suggestion: 'Call simulate_process first.' } };
  return { ok: true, stateVersion: store.stateVersion, data: analyzeBottlenecks(result, parsed.data.top) };
}
