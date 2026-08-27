import { nanoid } from 'nanoid';
import { z } from 'zod';

import { checkProcessLimit } from '../limits';
import { executeCommand } from './shared';
import { durationSchema, positionSchema, stepTypeSchema } from './schemas';
import type { CommandContext, CommandResult } from './types';
import type { ProcessStep } from '../../types/process';

const zeroDuration = { minMinutes: 0, typicalMinutes: 0, maxMinutes: 0 };

const createStepSchema = z.object({
  id: z.string().trim().min(1).default(() => nanoid()),
  type: stepTypeSchema,
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  owner: z.string().trim().min(1).optional(),
  duration: durationSchema.default(zeroDuration),
  cost: z.number().finite().nonnegative().optional(),
  capacityPerHour: z.number().finite().positive().optional(),
  position: positionSchema.default({ x: 0, y: 0 }),
});

export function createStep(
  ctx: CommandContext,
  input: unknown,
): CommandResult<{ step: ProcessStep }> {
  return executeCommand(ctx, input, {
    schema: createStepSchema,
    checkReferences: (process, value) =>
      process.nodes.some((step) => step.id === value.id)
        ? {
            code: 'INVALID_INPUT',
            message: `A step already exists with id ${value.id}.`,
            details: { stepId: value.id },
          }
        : null,
    checkLimits: (process) => {
      const limit = checkProcessLimit('nodes', process.nodes.length + 1);
      return limit
        ? {
            code: limit.code,
            message: `The process can contain at most ${limit.limit} nodes.`,
            details: limit,
          }
        : null;
    },
    operation: (_process, value, commandCtx) => ({
      kind: 'create_step',
      step: {
        ...value,
        createdBy: commandCtx.actor,
        updatedAt: '',
      },
    }),
    apply: (process, value, now, commandCtx) => {
      process.nodes.push({
        ...value,
        createdBy: commandCtx.actor,
        updatedAt: now,
      });
    },
    change: (_before, after, value) => {
      const step = after.nodes.find((node) => node.id === value.id);
      return {
        kind: 'create_step',
        entityIds: [value.id],
        summary: `Created ${value.name}.`,
        after: step,
        data: { step: step as ProcessStep },
      };
    },
  });
}
