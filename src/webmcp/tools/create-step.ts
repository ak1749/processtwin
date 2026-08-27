import { createStep } from '../../domain/commands/create-step';
import { createStepInputSchema, jsonSchema } from '../schemas';
import { commandEnvelope, invalidInputEnvelope } from './shared';
import type { ToolDef } from '../types';

export const createStepTool: ToolDef = {
  name: 'create_step',
  description: 'For small corrections to an existing workflow. To build or restructure several steps, use batch_mutate_process instead. Creates one step and assigns its canvas position automatically, so provide the business details rather than coordinates.',
  inputSchema: jsonSchema(createStepInputSchema),
  run: (input) => {
    const parsed = createStepInputSchema.safeParse(input);
    if (!parsed.success) return invalidInputEnvelope(parsed.error.issues);
    const { scenarioId, ...commandInput } = parsed.data;
    return commandEnvelope(createStep({ actor: 'agent', scenarioId }, commandInput), 'Created one process step.');
  },
};
