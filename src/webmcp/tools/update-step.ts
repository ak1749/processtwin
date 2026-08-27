import { updateStep } from '../../domain/commands/update-step';
import { jsonSchema, updateStepInputSchema } from '../schemas';
import { commandEnvelope, invalidInputEnvelope } from './shared';
import type { ToolDef } from '../types';

export const updateStepTool: ToolDef = {
  name: 'update_step',
  description: 'For small corrections to an existing workflow. To build or restructure several steps, use batch_mutate_process instead. Updates only the fields supplied for one existing step.',
  inputSchema: jsonSchema(updateStepInputSchema),
  run: (input) => {
    const parsed = updateStepInputSchema.safeParse(input);
    if (!parsed.success) return invalidInputEnvelope(parsed.error.issues);
    const { scenarioId, ...commandInput } = parsed.data;
    return commandEnvelope(updateStep({ actor: 'agent', scenarioId }, commandInput), 'Updated one process step.');
  },
};
