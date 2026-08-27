import { getProcessGraph } from '../../domain/queries/process-queries';
import { ok } from '../envelope';
import { getProcessGraphInputSchema, jsonSchema } from '../schemas';
import { invalidInputEnvelope } from './shared';
import type { ToolDef } from '../types';

export const getProcessGraphTool: ToolDef = {
  name: 'get_process_graph',
  description: 'Returns the full workflow graph, or a bounded neighbourhood around selected step ids. Use a focused graph when you need to reason about a local change without spending tokens on unrelated steps.',
  inputSchema: jsonSchema(getProcessGraphInputSchema),
  annotations: { readOnlyHint: true },
  run: (input) => {
    const parsed = getProcessGraphInputSchema.safeParse(input);
    if (!parsed.success) return invalidInputEnvelope(parsed.error.issues);
    return ok('Returned the requested process graph.', getProcessGraph(parsed.data.stepIds, parsed.data.depth));
  },
};
