import { nanoid } from 'nanoid';
import { z } from 'zod';

import { executeCommand, stepNotFoundError } from './shared';
import type { CommandContext, CommandResult } from './types';
import type { ProcessPolicy } from '../../types/process';

const addPolicySchema = z.object({
  label: z.string().trim().min(1),
  rule: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('lock_step'), stepId: z.string().trim().min(1), lockedFields: z.array(z.enum(['type', 'name', 'description', 'owner', 'duration', 'cost', 'capacityPerHour', 'position', 'id', 'createdBy', 'updatedAt'])).min(1) }),
    z.object({ kind: z.literal('no_delete'), stepId: z.string().trim().min(1) }),
  ]),
});

export function addPolicy(ctx: CommandContext, input: unknown): CommandResult<{ policy: ProcessPolicy }> {
  return executeCommand(ctx, input, {
    schema: addPolicySchema,
    checkReferences: (process, value) => process.nodes.some((step) => step.id === value.rule.stepId) ? null : stepNotFoundError(process, value.rule.stepId),
    operation: () => ({ kind: 'set_variable', variable: { key: '__policy__', label: 'policy', kind: 'constant', value: 0 } }),
    apply: (process, value) => { process.policies.push({ id: nanoid(), label: value.label, createdBy: ctx.actor, rule: value.rule }); },
    change: (_before, after) => {
      const policy = after.policies.at(-1) as ProcessPolicy;
      return { kind: 'add_policy', entityIds: [policy.id], summary: `Added policy ${policy.label}.`, after: policy, data: { policy } };
    },
  });
}
