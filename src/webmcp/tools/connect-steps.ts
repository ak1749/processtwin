import { connectSteps } from '../../domain/commands/connect-steps';
import { connectStepsInputSchema, jsonSchema } from '../schemas';
import { commandEnvelope, invalidInputEnvelope } from './shared';
import type { ToolDef } from '../types';

export const connectStepsTool: ToolDef = {
  name: 'connect_steps',
  description: 'For small corrections to an existing workflow. To build or restructure several steps, use batch_mutate_process instead. Connects two existing steps with an optional branch condition or fallback probability.',
  inputSchema: jsonSchema(connectStepsInputSchema),
  run: (input) => {
    const parsed = connectStepsInputSchema.safeParse(input);
    if (!parsed.success) return invalidInputEnvelope(parsed.error.issues);
    const { scenarioId, ...commandInput } = parsed.data;
    return commandEnvelope(connectSteps({ actor: 'agent', scenarioId }, commandInput), 'Connected two process steps.');
  },
};
