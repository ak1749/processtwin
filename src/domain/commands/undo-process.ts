import { z } from 'zod';

import { useProcessStore } from '../../stores/process-store';
import type { CommandContext, CommandResult } from './types';

const undoProcessSchema = z.object({}).strict();

export function undoProcess(
  _ctx: CommandContext,
  input: unknown,
): CommandResult<{ undone: boolean }> {
  const parsed = undoProcessSchema.safeParse(input);
  const store = useProcessStore.getState();
  if (!parsed.success) {
    return {
      ok: false,
      stateVersion: store.stateVersion,
      error: { code: 'INVALID_INPUT', message: 'The command input is invalid.', details: parsed.error.issues },
    };
  }

  const undone = store.past.length > 0;
  if (undone) useProcessStore.getState().undo();
  return { ok: true, stateVersion: useProcessStore.getState().stateVersion, data: { undone } };
}
