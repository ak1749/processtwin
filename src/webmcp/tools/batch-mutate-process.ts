import { batchMutateProcess } from '../../domain/commands/batch-mutate-process';
import { batchMutateProcessInputSchema, jsonSchema } from '../schemas';
import { commandEnvelope } from './shared';
import type { ToolDef } from '../types';

export const batchMutateProcessTool: ToolDef = {
  name: 'batch_mutate_process',
  description: 'Applies multiple process changes in a single atomic transaction. Use this to build or restructure a workflow — it is strongly preferred over repeated single-step calls. Reference steps created earlier in the same batch by their tempId. If any operation is invalid the entire batch is rejected and nothing changes, so you can retry safely.',
  inputSchema: jsonSchema(batchMutateProcessInputSchema),
  annotations: { idempotentHint: false },
  run: (input) => {
    return commandEnvelope(
      batchMutateProcess({ actor: 'agent' }, input),
      'Applied the requested process changes as one atomic transaction.',
      ['Call get_process_summary to inspect the shared current state.'],
    );
  },
};
