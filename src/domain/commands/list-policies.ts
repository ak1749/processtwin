import { z } from 'zod';

import { getScenario } from '../scenarios';
import { useProcessStore } from '../../stores/process-store';
import type { ProcessPolicy } from '../../types/process';
import type { CommandContext, CommandResult } from './types';

const listPoliciesSchema = z.object({ scenarioId: z.string().trim().min(1).optional() }).strict();

export function listProcessPolicies(_ctx: CommandContext, input: unknown): CommandResult<{ policies: ProcessPolicy[] }> {
  const parsed = listPoliciesSchema.safeParse(input);
  const state = useProcessStore.getState();
  if (!parsed.success) return { ok: false, stateVersion: state.stateVersion, error: { code: 'INVALID_INPUT', message: 'The command input is invalid.', details: parsed.error.issues } };

  const scenario = parsed.data.scenarioId ? getScenario(parsed.data.scenarioId) : undefined;
  if (parsed.data.scenarioId && !scenario) {
    return { ok: false, stateVersion: state.stateVersion, error: { code: 'SCENARIO_NOT_FOUND', message: `No scenario exists with id ${parsed.data.scenarioId}.` } };
  }
  return { ok: true, stateVersion: state.stateVersion, data: { policies: (scenario?.process ?? state.process).policies } };
}
