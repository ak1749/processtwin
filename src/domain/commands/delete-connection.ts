import { z } from 'zod';

import { edgeNotFoundError, executeCommand } from './shared';
import type { CommandContext, CommandResult } from './types';
import type { ProcessConnection } from '../../types/process';

const deleteConnectionSchema = z.object({
  id: z.string().trim().min(1),
});

export function deleteConnection(
  ctx: CommandContext,
  input: unknown,
): CommandResult<{ connection: ProcessConnection }> {
  return executeCommand(ctx, input, {
    schema: deleteConnectionSchema,
    checkReferences: (process, value) =>
      process.edges.some((edge) => edge.id === value.id)
        ? null
        : edgeNotFoundError(value.id),
    operation: (_process, value) => ({
      kind: 'delete_connection',
      connectionId: value.id,
    }),
    apply: (process, value) => {
      process.edges = process.edges.filter((edge) => edge.id !== value.id);
    },
    change: (before, _after, value) => {
      const connection = before.edges.find((edge) => edge.id === value.id) as ProcessConnection;
      return {
        kind: 'delete_connection',
        entityIds: [connection.id, connection.source, connection.target],
        summary: 'Deleted a connection.',
        before: connection,
        data: { connection },
      };
    },
  });
}
