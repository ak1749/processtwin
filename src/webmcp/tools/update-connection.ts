import { updateConnection } from '../../domain/commands/update-connection';
import { jsonSchema, updateConnectionInputSchema } from '../schemas';
import { commandEnvelope, invalidInputEnvelope } from './shared';
import type { ToolDef } from '../types';

export const updateConnectionTool: ToolDef = {
  name: 'update_connection',
  description: 'For small corrections to an existing workflow. To build or restructure several steps, use batch_mutate_process instead. Updates one existing connection, including its endpoints, condition, label, or probability.',
  inputSchema: jsonSchema(updateConnectionInputSchema),
  run: (input) => {
    const parsed = updateConnectionInputSchema.safeParse(input);
    if (!parsed.success) return invalidInputEnvelope(parsed.error.issues);
    const { scenarioId, ...commandInput } = parsed.data;
    return commandEnvelope(updateConnection({ actor: 'agent', scenarioId }, commandInput), 'Updated one process connection.');
  },
};
