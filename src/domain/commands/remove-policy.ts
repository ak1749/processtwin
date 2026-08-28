import { z } from 'zod';

import { executeCommand } from './shared';
import type { CommandContext, CommandResult } from './types';
import type { ProcessPolicy } from '../../types/process';

const removePolicySchema = z.object({ id: z.string().trim().min(1) });

export function removePolicy(ctx: CommandContext, input: unknown): CommandResult<{ policy: ProcessPolicy }> {
  return executeCommand(ctx, input, {
    schema: removePolicySchema,
    checkReferences: (process, value) => process.policies.some((policy) => policy.id === value.id) ? null : { code: 'INVALID_INPUT', message: `No policy exists with id ${value.id}.` },
    operation: () => ({ kind: 'set_variable', variable: { key: '__policy__', label: 'policy', kind: 'constant', value: 0 } }),
    apply: (process, value) => { process.policies = process.policies.filter((policy) => policy.id !== value.id); },
    change: (before, _after, value) => {
      const policy = before.policies.find((entry) => entry.id === value.id) as ProcessPolicy;
      return { kind: 'remove_policy', entityIds: [policy.id], summary: `Removed policy ${policy.label}.`, before: policy, data: { policy } };
    },
  });
}
