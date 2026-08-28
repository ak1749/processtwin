import { repositionSteps } from '../../domain/commands/reposition-steps';
import { autoLayoutInputSchema, jsonSchema } from '../schemas';
import { commandEnvelope, invalidInputEnvelope } from './shared';
import type { ToolDef } from '../types';

export const autoLayoutTool: ToolDef = {
  name: 'auto_layout',
  description: 'Arranges every step into a readable directed graph as one atomic change. Use LR for a left-to-right workflow or TB for top-to-bottom; the layout creates one undo entry and works on main or a scenario.',
  inputSchema: jsonSchema(autoLayoutInputSchema),
  annotations: { idempotentHint: true },
  run: (input) => {
    const parsed = autoLayoutInputSchema.safeParse(input);
    if (!parsed.success) return invalidInputEnvelope(parsed.error.issues);
    const { scenarioId, direction } = parsed.data;
    return commandEnvelope(
      repositionSteps({ actor: 'agent', scenarioId }, { direction }),
      `Arranged the process ${direction === 'LR' ? 'left to right' : 'top to bottom'} as one atomic change.`,
    );
  },
};
