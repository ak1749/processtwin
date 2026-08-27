import { z } from 'zod';

import { validateProcess, type ValidationResult } from '../validation/validate-process';
import { useProcessStore } from '../../stores/process-store';
import type { CommandContext, CommandResult } from './types';

const validateProcessSchema = z.object({ scenarioId: z.string().trim().min(1).optional() }).strict();

export function validateCurrentProcess(ctx: CommandContext, input: unknown): CommandResult<ValidationResult> {
  const store = useProcessStore.getState();
  const parsed = validateProcessSchema.safeParse(input);
  if (!parsed.success) return { ok: false, stateVersion: store.stateVersion, error: { code: 'INVALID_INPUT', message: 'The command input is invalid.', details: parsed.error.issues } };
  if (ctx.scenarioId ?? parsed.data.scenarioId) return { ok: false, stateVersion: store.stateVersion, error: { code: 'SCENARIO_NOT_FOUND', message: 'Scenario validation is available in a later phase.', suggestion: 'Retry without scenarioId against the current process.' } };
  return { ok: true, stateVersion: store.stateVersion, data: validateProcess(store.process) };
}
