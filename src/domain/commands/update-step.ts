import { z } from 'zod';

import type { StepChanges } from '../policies';
import { executeCommand, stepNotFoundError } from './shared';
import { durationSchema, positionSchema, stepTypeSchema } from './schemas';
import type { CommandContext, CommandResult } from './types';
import type { ProcessStep } from '../../types/process';

const stepChangesSchema = z
  .object({
    type: stepTypeSchema,
    name: z.string().trim().min(1),
    description: z.string().trim().min(1),
    owner: z.string().trim().min(1),
    duration: durationSchema,
    cost: z.number().finite().nonnegative(),
    capacityPerHour: z.number().finite().positive(),
    position: positionSchema,
  })
  .partial()
  .refine((changes) => Object.keys(changes).length > 0, 'Provide at least one change.');

const updateStepSchema = z.object({
  id: z.string().trim().min(1),
  changes: stepChangesSchema,
});

export function updateStep(
  ctx: CommandContext,
  input: unknown,
): CommandResult<{ step: ProcessStep }> {
  return executeCommand(ctx, input, {
    schema: updateStepSchema,
    checkReferences: (process, value) =>
      process.nodes.some((step) => step.id === value.id)
        ? null
        : stepNotFoundError(process, value.id),
    operation: (_process, value) => ({
      kind: 'update_step',
      stepId: value.id,
      changes: value.changes as StepChanges,
    }),
    apply: (process, value, now) => {
      const step = process.nodes.find((node) => node.id === value.id);
      if (!step) return;
      Object.assign(step, value.changes);
      step.updatedAt = now;
    },
    change: (before, after, value) => ({
      kind: 'update_step',
      entityIds: [value.id],
      summary: `Updated ${after.nodes.find((node) => node.id === value.id)?.name ?? value.id}.`,
      before: before.nodes.find((node) => node.id === value.id),
      after: after.nodes.find((node) => node.id === value.id),
      data: {
        step: after.nodes.find((node) => node.id === value.id) as ProcessStep,
      },
    }),
  });
}
