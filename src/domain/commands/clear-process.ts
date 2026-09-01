import { z } from 'zod';

import { executeCommand } from './shared';
import type { CommandContext, CommandResult } from './types';

const clearProcessSchema = z.object({}).strict();

export function clearProcess(
  ctx: CommandContext,
  input: unknown,
): CommandResult<{ clearedNodeCount: number; clearedEdgeCount: number }> {
  return executeCommand(ctx, input, {
    schema: clearProcessSchema,
    operation: () => ({ kind: 'clear_process' }),
    apply: (process) => {
      process.nodes = [];
      process.edges = [];
      process.variables = [];
      process.policies = [];
    },
    change: (before) => ({
      kind: 'clear_process',
      entityIds: [
        ...before.nodes.map((node) => node.id),
        ...before.edges.map((edge) => edge.id),
        ...before.variables.map((variable) => variable.key),
        ...before.policies.map((policy) => policy.id),
      ],
      summary: 'Cleared the process workspace.',
      before: {
        nodes: before.nodes,
        edges: before.edges,
        variables: before.variables,
        policies: before.policies,
      },
      data: {
        clearedNodeCount: before.nodes.length,
        clearedEdgeCount: before.edges.length,
      },
    }),
  });
}
