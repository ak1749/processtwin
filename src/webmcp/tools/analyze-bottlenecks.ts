import { analyzeCurrentBottlenecks } from '../../domain/commands/analyze-bottlenecks';
import { analyzeBottlenecksInputSchema, jsonSchema } from '../schemas';
import { commandEnvelope, invalidInputEnvelope } from './shared';
import type { ToolDef } from '../types';

export const analyzeBottlenecksTool: ToolDef = {
  name: 'analyze_bottlenecks',
  description: 'Ranks steps from the latest simulation using cycle-time share, average duration, and utilisation. Each result includes plain-English reasons suitable for explaining what drives P95.',
  inputSchema: jsonSchema(analyzeBottlenecksInputSchema),
  annotations: { readOnlyHint: true },
  run: (input) => {
    const parsed = analyzeBottlenecksInputSchema.safeParse(input);
    if (!parsed.success) return invalidInputEnvelope(parsed.error.issues);
    return commandEnvelope(analyzeCurrentBottlenecks({ actor: 'agent', scenarioId: parsed.data.scenarioId }, parsed.data), 'Ranked bottlenecks from the latest simulation.');
  },
};
