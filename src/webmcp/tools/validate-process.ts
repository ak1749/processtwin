import { validateCurrentProcess } from '../../domain/commands/validate-process';
import { jsonSchema, validateProcessInputSchema } from '../schemas';
import { commandEnvelope, invalidInputEnvelope } from './shared';
import type { ToolDef } from '../types';

export const validateProcessTool: ToolDef = {
  name: 'validate_process',
  description: 'Validates the full process graph deterministically. Returns structured errors, warnings, and suggested fixes so you can correct a workflow before simulating it.',
  inputSchema: jsonSchema(validateProcessInputSchema),
  annotations: { readOnlyHint: true },
  run: (input) => {
    const parsed = validateProcessInputSchema.safeParse(input);
    if (!parsed.success) return invalidInputEnvelope(parsed.error.issues);
    return commandEnvelope(validateCurrentProcess({ actor: 'agent', scenarioId: parsed.data.scenarioId }, parsed.data), 'Validated the current process and returned structured fixes.');
  },
};
