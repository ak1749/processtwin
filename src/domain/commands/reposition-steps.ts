import { z } from 'zod';

import { autoLayout } from '../layout/auto-layout';
import { executeCommand } from './shared';
import type { CommandContext, CommandResult } from './types';

const repositionStepsSchema = z.object({
  direction: z.enum(['LR', 'TB']).default('LR'),
}).strict();

interface RepositionedStep {
  id: string;
  position: { x: number; y: number };
}

export function repositionSteps(
  ctx: CommandContext,
  input: unknown,
): CommandResult<{ positions: RepositionedStep[] }> {
  return executeCommand(ctx, input, {
    schema: repositionStepsSchema,
    operation: (process, value) => ({
      kind: 'reposition_steps',
      positions: autoLayout(process.nodes, process.edges, value.direction),
    }),
    apply: (process, value, now) => {
      const positions = new Map(
        autoLayout(process.nodes, process.edges, value.direction).map((entry) => [entry.id, entry.position]),
      );
      for (const step of process.nodes) {
        const position = positions.get(step.id);
        if (!position) continue;
        step.position = position;
        step.updatedAt = now;
      }
    },
    change: (before, after) => {
      const positions = after.nodes.map((step) => ({ id: step.id, position: step.position }));
      return {
        kind: 'reposition_steps',
        entityIds: positions.map((entry) => entry.id),
        summary: `Repositioned ${positions.length} step${positions.length === 1 ? '' : 's'}.`,
        before: before.nodes.map((step) => ({ id: step.id, position: step.position })),
        after: positions,
        data: { positions },
      };
    },
  });
}
