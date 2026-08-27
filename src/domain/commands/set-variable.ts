import { z } from 'zod';

import { executeCommand } from './shared';
import { variableSchema } from './schemas';
import type { CommandContext, CommandResult } from './types';
import type { VariableSpec } from '../../types/process';

const setVariableSchema = z.object({
  variable: variableSchema,
});

export function setVariable(
  ctx: CommandContext,
  input: unknown,
): CommandResult<{ variable: VariableSpec }> {
  return executeCommand(ctx, input, {
    schema: setVariableSchema,
    operation: (_process, value) => ({ kind: 'set_variable', variable: value.variable }),
    apply: (process, value) => {
      const index = process.variables.findIndex(
        (variable) => variable.key === value.variable.key,
      );
      if (index === -1) process.variables.push(value.variable);
      else process.variables[index] = value.variable;
    },
    change: (before, after, value) => ({
      kind: 'set_variable',
      entityIds: [value.variable.key],
      summary: `Set variable ${value.variable.label}.`,
      before: before.variables.find(
        (variable) => variable.key === value.variable.key,
      ),
      after: after.variables.find(
        (variable) => variable.key === value.variable.key,
      ),
      data: {
        variable: after.variables.find(
          (variable) => variable.key === value.variable.key,
        ) as VariableSpec,
      },
    }),
  });
}
