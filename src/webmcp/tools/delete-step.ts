import { deleteStep } from '../../domain/commands/delete-step';
import { deleteStepInputSchema, jsonSchema } from '../schemas';
import { commandEnvelope, invalidInputEnvelope } from './shared';
import type { ToolDef } from '../types';

export const deleteStepTool: ToolDef = {
  name: 'delete_step',
  description: 'For small corrections to an existing workflow. To build or restructure several steps, use batch_mutate_process instead. Deletes one step and cascades its connections; confirm is required when more than two connections will be removed.',
  inputSchema: jsonSchema(deleteStepInputSchema),
  annotations: { destructiveHint: true },
  run: (input) => {
    const parsed = deleteStepInputSchema.safeParse(input);
    if (!parsed.success) return invalidInputEnvelope(parsed.error.issues);
    const { scenarioId, ...commandInput } = parsed.data;
    return commandEnvelope(deleteStep({ actor: 'agent', scenarioId }, commandInput), 'Deleted one process step and its connected edges.');
  },
};
