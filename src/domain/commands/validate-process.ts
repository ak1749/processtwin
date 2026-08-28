import { z } from 'zod';

import { validateProcess, type ValidationResult } from '../validation/validate-process';
import { useProcessStore } from '../../stores/process-store';
import { getScenario } from '../scenarios';
import type { CommandContext, CommandResult } from './types';

const validateProcessSchema = z.object({ scenarioId: z.string().trim().min(1).optional() }).strict();

export function validateCurrentProcess(ctx: CommandContext, input: unknown): CommandResult<ValidationResult> {
  const store = useProcessStore.getState();
  const parsed = validateProcessSchema.safeParse(input);
  if (!parsed.success) return { ok: false, stateVersion: store.stateVersion, error: { code: 'INVALID_INPUT', message: 'The command input is invalid.', details: parsed.error.issues } };
  const scenarioId = ctx.scenarioId ?? parsed.data.scenarioId;
  const scenario = scenarioId ? getScenario(scenarioId) : undefined;
  if (scenarioId && !scenario) return { ok: false, stateVersion: store.stateVersion, error: { code: 'SCENARIO_NOT_FOUND', message: `No scenario exists with id ${scenarioId}.` } };
  return { ok: true, stateVersion: store.stateVersion, data: validateProcess(scenario?.process ?? store.process) };
}
