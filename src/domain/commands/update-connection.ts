import { z } from 'zod';

import type { ConnectionChanges } from '../policies';
import { edgeNotFoundError, executeCommand, stepNotFoundError } from './shared';
import { conditionSchema } from './schemas';
import type { CommandContext, CommandResult } from './types';
import type { ProcessConnection } from '../../types/process';

const connectionChangesSchema = z
  .object({
    source: z.string().trim().min(1),
    target: z.string().trim().min(1),
    label: z.string().trim().min(1).nullable(),
    condition: conditionSchema.nullable(),
    probability: z.number().min(0).max(1).nullable(),
  })
  .partial()
  .refine((changes) => Object.keys(changes).length > 0, 'Provide at least one change.');

const updateConnectionSchema = z.object({
  id: z.string().trim().min(1),
  changes: connectionChangesSchema,
});

export function updateConnection(
  ctx: CommandContext,
  input: unknown,
): CommandResult<{ connection: ProcessConnection }> {
  return executeCommand(ctx, input, {
    schema: updateConnectionSchema,
    checkReferences: (process, value) => {
      const existing = process.edges.find((edge) => edge.id === value.id);
      if (!existing) return edgeNotFoundError(value.id);

      const sourceId = value.changes.source ?? existing.source;
      const targetId = value.changes.target ?? existing.target;
      const source = process.nodes.find((step) => step.id === sourceId);
      if (!source) return stepNotFoundError(process, sourceId);
      if (!process.nodes.some((step) => step.id === targetId)) {
        return stepNotFoundError(process, targetId);
      }
      if (sourceId === targetId) {
        return { code: 'SELF_LOOP', message: 'A connection cannot point to the same step.' };
      }
      if (source.type === 'end') {
        return {
          code: 'END_HAS_OUTGOING',
          message: 'End steps cannot have outgoing connections.',
        };
      }
      if (
        process.edges.some(
          (edge) =>
            edge.id !== value.id && edge.source === sourceId && edge.target === targetId,
        )
      ) {
        return {
          code: 'DUPLICATE_EDGE',
          message: 'A connection already exists between these steps.',
          details: { source: sourceId, target: targetId },
        };
      }
      return null;
    },
    operation: (_process, value) => ({
      kind: 'update_connection',
      connectionId: value.id,
      changes: value.changes as ConnectionChanges,
    }),
    apply: (process, value) => {
      const connection = process.edges.find((edge) => edge.id === value.id);
      if (!connection) return;
      for (const [field, change] of Object.entries(value.changes)) {
        if (change === null) delete connection[field as keyof ProcessConnection];
        else Object.assign(connection, { [field]: change });
      }
    },
    change: (before, after, value) => ({
      kind: 'update_connection',
      entityIds: [value.id],
      summary: 'Updated a connection.',
      before: before.edges.find((edge) => edge.id === value.id),
      after: after.edges.find((edge) => edge.id === value.id),
      data: {
        connection: after.edges.find((edge) => edge.id === value.id) as ProcessConnection,
      },
    }),
  });
}
