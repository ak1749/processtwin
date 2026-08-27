import { nanoid } from 'nanoid';
import { z } from 'zod';

import { checkProcessLimit } from '../limits';
import { executeCommand, stepNotFoundError } from './shared';
import { conditionSchema } from './schemas';
import type { CommandContext, CommandResult } from './types';
import type { ProcessConnection } from '../../types/process';

const connectStepsSchema = z.object({
  id: z.string().trim().min(1).default(() => nanoid()),
  source: z.string().trim().min(1),
  target: z.string().trim().min(1),
  label: z.string().trim().min(1).optional(),
  condition: conditionSchema.optional(),
  probability: z.number().min(0).max(1).optional(),
});

export function connectSteps(
  ctx: CommandContext,
  input: unknown,
): CommandResult<{ connection: ProcessConnection }> {
  return executeCommand(ctx, input, {
    schema: connectStepsSchema,
    checkReferences: (process, value) => {
      const source = process.nodes.find((step) => step.id === value.source);
      if (!source) return stepNotFoundError(process, value.source);
      if (!process.nodes.some((step) => step.id === value.target)) {
        return stepNotFoundError(process, value.target);
      }
      if (value.source === value.target) {
        return { code: 'SELF_LOOP', message: 'A connection cannot point to the same step.' };
      }
      if (source.type === 'end') {
        return {
          code: 'END_HAS_OUTGOING',
          message: 'End steps cannot have outgoing connections.',
        };
      }
      if (process.edges.some((edge) => edge.id === value.id)) {
        return {
          code: 'INVALID_INPUT',
          message: `A connection already exists with id ${value.id}.`,
          details: { edgeId: value.id },
        };
      }
      if (process.edges.some((edge) => edge.source === value.source && edge.target === value.target)) {
        return {
          code: 'DUPLICATE_EDGE',
          message: 'A connection already exists between these steps.',
          details: { source: value.source, target: value.target },
        };
      }
      return null;
    },
    checkLimits: (process) => {
      const limit = checkProcessLimit('edges', process.edges.length + 1);
      return limit
        ? {
            code: limit.code,
            message: `The process can contain at most ${limit.limit} connections.`,
            details: limit,
          }
        : null;
    },
    operation: (_process, value, commandCtx) => ({
      kind: 'connect_steps',
      connection: { ...value, createdBy: commandCtx.actor },
    }),
    apply: (process, value, _now, commandCtx) => {
      process.edges.push({ ...value, createdBy: commandCtx.actor });
    },
    change: (_before, after, value) => {
      const connection = after.edges.find((edge) => edge.id === value.id) as ProcessConnection;
      return {
        kind: 'connect_steps',
        entityIds: [connection.id, connection.source, connection.target],
        summary: 'Connected two steps.',
        after: connection,
        data: { connection },
      };
    },
  });
}
