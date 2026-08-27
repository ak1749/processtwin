import { runSimulation } from '../../domain/commands/run-simulation';
import { commandEnvelope, invalidInputEnvelope } from './shared';
import { jsonSchema, simulateProcessInputSchema } from '../schemas';
import type { ToolDef } from '../types';

export const simulateProcessTool: ToolDef = {
  name: 'simulate_process',
  description: 'Runs a seeded two-pass Monte Carlo simulation of the current process. Use iterations from 100 to 50,000 and a seed for reproducible queueing, P50, P95, completion, and cost results.',
  inputSchema: jsonSchema(simulateProcessInputSchema),
  annotations: { readOnlyHint: true },
  run: (input) => {
    const parsed = simulateProcessInputSchema.safeParse(input);
    if (!parsed.success) return invalidInputEnvelope(parsed.error.issues);
    const { scenarioId, ...commandInput } = parsed.data;
    return commandEnvelope(runSimulation({ actor: 'agent', scenarioId }, commandInput), 'Simulation completed with reproducible seeded results.', ['Call analyze_bottlenecks to rank the limiting steps.']);
  },
};
