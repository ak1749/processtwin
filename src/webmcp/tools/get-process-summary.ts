import { getProcessSummary } from '../../domain/queries/process-queries';
import { ok } from '../envelope';
import { getProcessSummaryInputSchema, jsonSchema } from '../schemas';
import { invalidInputEnvelope } from './shared';
import type { ToolDef } from '../types';

export const getProcessSummaryTool: ToolDef = {
  name: 'get_process_summary',
  description: 'Returns a compact overview of the process currently open in ProcessTwin — every step with its id, type, timing and owner, plus active policy constraints and the latest simulation headline. Call this first. It is much cheaper than get_process_graph and is sufficient for most reasoning.',
  inputSchema: jsonSchema(getProcessSummaryInputSchema),
  annotations: { readOnlyHint: true },
  run: (input) => {
    const parsed = getProcessSummaryInputSchema.safeParse(input);
    if (!parsed.success) return invalidInputEnvelope(parsed.error.issues);
    return ok('Returned a compact overview of the current process.', getProcessSummary());
  },
};
