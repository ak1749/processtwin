import { getChangesSince } from '../../domain/queries/process-queries';
import { ok } from '../envelope';
import { getChangesSinceInputSchema, jsonSchema } from '../schemas';
import { invalidInputEnvelope } from './shared';
import type { ToolDef } from '../types';

export const getChangesSinceTool: ToolDef = {
  name: 'get_changes_since',
  description: 'Returns the ordered process changes since a state-version cursor, including who made each change and before/after values when available. Use this after the human has edited the workflow so your response reflects the shared current state.',
  inputSchema: jsonSchema(getChangesSinceInputSchema),
  annotations: { readOnlyHint: true },
  run: (input) => {
    const parsed = getChangesSinceInputSchema.safeParse(input);
    if (!parsed.success) return invalidInputEnvelope(parsed.error.issues);
    return ok('Returned the ordered changes since the requested version.', getChangesSince(parsed.data.sinceVersion));
  },
};
