import { z } from 'zod';

import { useProcessStore } from '../../stores/process-store';
import type { CommandContext, CommandResult } from './types';

const redoProcessSchema = z.object({}).strict();

export function redoProcess(
  _ctx: CommandContext,
  input: unknown,
): CommandResult<{ redone: boolean }> {
  const parsed = redoProcessSchema.safeParse(input);
  const store = useProcessStore.getState();
  if (!parsed.success) {
    return {
      ok: false,
      stateVersion: store.stateVersion,
      error: { code: 'INVALID_INPUT', message: 'The command input is invalid.', details: parsed.error.issues },
    };
  }

  const redone = store.future.length > 0;
  if (redone) useProcessStore.getState().redo();
  return { ok: true, stateVersion: useProcessStore.getState().stateVersion, data: { redone } };
}
