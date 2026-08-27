import { z } from 'zod';

import { executeCommand, stepNotFoundError } from './shared';
import type { CommandContext, CommandResult } from './types';
import type { ProcessConnection, ProcessStep } from '../../types/process';

const deleteStepSchema = z.object({
  id: z.string().trim().min(1),
  confirm: z.boolean().default(false),
});

export function deleteStep(
  ctx: CommandContext,
  input: unknown,
): CommandResult<{ deletedStep: ProcessStep; deletedEdges: ProcessConnection[] }> {
  return executeCommand(ctx, input, {
    schema: deleteStepSchema,
    checkReferences: (process, value) => {
      if (!process.nodes.some((step) => step.id === value.id)) {
        return stepNotFoundError(process, value.id);
      }

      const connectedEdges = process.edges.filter(
        (edge) => edge.source === value.id || edge.target === value.id,
      );
      if (connectedEdges.length > 2 && !value.confirm) {
        return {
          code: 'INVALID_INPUT',
          message: 'Deleting this step also removes more than two connections.',
          details: {
            confirmationRequired: true,
            connectionCount: connectedEdges.length,
          },
          suggestion: 'Retry with confirm: true to delete this step and its connections.',
        };
      }

      return null;
    },
    operation: (_process, value) => ({ kind: 'delete_step', stepId: value.id }),
    apply: (process, value) => {
      process.nodes = process.nodes.filter((step) => step.id !== value.id);
      process.edges = process.edges.filter(
        (edge) => edge.source !== value.id && edge.target !== value.id,
      );
    },
    change: (before, _after, value) => {
      const deletedStep = before.nodes.find((step) => step.id === value.id) as ProcessStep;
      const deletedEdges = before.edges.filter(
        (edge) => edge.source === value.id || edge.target === value.id,
      );
      return {
        kind: 'delete_step',
        entityIds: [value.id, ...deletedEdges.map((edge) => edge.id)],
        summary: `Deleted ${deletedStep.name} and ${deletedEdges.length} connection${deletedEdges.length === 1 ? '' : 's'}.`,
        before: { step: deletedStep, edges: deletedEdges },
        data: { deletedStep, deletedEdges },
      };
    },
  });
}
