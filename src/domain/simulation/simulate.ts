import type { BusinessProcess, Operator, ProcessConnection, VariableSpec } from '../../types/process';
import type { SimulationFailure, SimulationResult, SimulationStepMetric } from '../../types/simulation';
import { mulberry32, sampleExponential, sampleTriangular } from './rng';

export interface SimulateOptions { iterations?: number; seed?: number }

interface QueueProfile { utilization: number; meanWaitMinutes: number }
interface PassResult {
  durations: number[];
  costs: number[];
  completedCases: number;
  failures: SimulationFailure[];
  visits: Map<string, { count: number; duration: number; queueWait: number; cost: number }>;
}

const VISIT_CAP = 100;

function compare(left: number | boolean | string | undefined, operator: Operator, right: number | boolean | string): boolean {
  switch (operator) {
    case 'eq': return left === right;
    case 'neq': return left !== right;
    case 'gt': return typeof left === 'number' && typeof right === 'number' && left > right;
    case 'gte': return typeof left === 'number' && typeof right === 'number' && left >= right;
    case 'lt': return typeof left === 'number' && typeof right === 'number' && left < right;
    case 'lte': return typeof left === 'number' && typeof right === 'number' && left <= right;
  }
}

function sampleVariable(spec: VariableSpec, random: () => number): number | boolean {
  if (spec.kind === 'number') return sampleTriangular(random, spec.min, spec.typical, spec.max);
  if (spec.kind === 'boolean') return random() < spec.probability;
  return spec.value;
}

function selectNextEdge(edges: ProcessConnection[], variables: Record<string, number | boolean>, random: () => number): ProcessConnection | undefined {
  for (const edge of edges) if (edge.condition && compare(variables[edge.condition.variable], edge.condition.operator, edge.condition.value)) return edge;
  const unconditional = edges.filter((edge) => !edge.condition);
  if (unconditional.length === 0) return undefined;
  const weighted = unconditional.filter((edge) => edge.probability !== undefined);
  if (weighted.length === 0) return unconditional[Math.floor(random() * unconditional.length)];
  const total = weighted.reduce((sum, edge) => sum + (edge.probability ?? 0), 0);
  if (total <= 0) return unconditional[Math.floor(random() * unconditional.length)];
  let cursor = random() * total;
  for (const edge of weighted) {
    cursor -= edge.probability ?? 0;
    if (cursor <= 0) return edge;
  }
  return weighted[weighted.length - 1];
}

function percentile(sorted: number[], value: number): number {
  if (sorted.length === 0) return 0;
  const index = (sorted.length - 1) * value;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function calculatePercentile(values: number[], value: number): number {
  return percentile([...values].sort((left, right) => left - right), value);
}

function runPass(process: BusinessProcess, iterations: number, seed: number, queueProfiles: Map<string, QueueProfile>): PassResult {
  const random = mulberry32(seed);
  const starts = process.nodes.filter((node) => node.type === 'start');
  const nodes = new Map(process.nodes.map((node) => [node.id, node]));
  const outgoing = new Map(process.nodes.map((node) => [node.id, process.edges.filter((edge) => edge.source === node.id)]));
  const visits = new Map(process.nodes.map((node) => [node.id, { count: 0, duration: 0, queueWait: 0, cost: 0 }]));
  const durations: number[] = [];
  const costs: number[] = [];
  const failures: SimulationFailure[] = [];
  let completedCases = 0;

  for (let caseIndex = 0; caseIndex < iterations; caseIndex += 1) {
    if (starts.length === 0) { failures.push({ code: 'NO_START' }); durations.push(0); costs.push(0); continue; }
    const variables = Object.fromEntries(process.variables.map((variable) => [variable.key, sampleVariable(variable, random)]));
    let cursor = starts[0].id;
    let caseDuration = 0;
    let caseCost = 0;
    let visitsThisCase = 0;
    let failed = false;
    while (visitsThisCase < VISIT_CAP) {
      const node = nodes.get(cursor);
      if (!node) { failures.push({ code: 'DEAD_END', stepId: cursor }); failed = true; break; }
      const profile = queueProfiles.get(node.id);
      const baseDuration = sampleTriangular(random, node.duration.minMinutes, node.duration.typicalMinutes, node.duration.maxMinutes);
      const queueWait = profile ? sampleExponential(random, profile.meanWaitMinutes) : 0;
      const visit = visits.get(node.id);
      if (visit) { visit.count += 1; visit.duration += baseDuration + queueWait; visit.queueWait += queueWait; visit.cost += node.cost ?? 0; }
      caseDuration += baseDuration + queueWait;
      caseCost += node.cost ?? 0;
      visitsThisCase += 1;
      if (node.type === 'end') { completedCases += 1; break; }
      const next = selectNextEdge(outgoing.get(node.id) ?? [], variables, random);
      if (!next) { failures.push({ code: 'DEAD_END', stepId: node.id }); failed = true; break; }
      cursor = next.target;
    }
    if (!failed && visitsThisCase >= VISIT_CAP && nodes.get(cursor)?.type !== 'end') failures.push({ code: 'VISIT_CAP', stepId: cursor });
    durations.push(caseDuration);
    costs.push(caseCost);
  }
  return { durations, costs, completedCases, failures, visits };
}

export function simulateProcess(process: BusinessProcess, options: SimulateOptions = {}): SimulationResult {
  const iterations = options.iterations ?? 5_000;
  const seed = options.seed ?? 42;
  const firstPass = runPass(process, iterations, seed, new Map());
  const queues = new Map<string, QueueProfile>();
  const warnings: string[] = [];
  for (const node of process.nodes) {
    if (!node.capacityPerHour) continue;
    const visitRate = (firstPass.visits.get(node.id)?.count ?? 0) / iterations;
    const arrivalRate = process.arrivalRatePerHour * visitRate;
    const utilization = Math.min(arrivalRate / node.capacityPerHour, 0.95);
    const meanWaitMinutes = (utilization / (1 - utilization)) * node.duration.typicalMinutes;
    queues.set(node.id, { utilization, meanWaitMinutes });
    if (utilization >= 0.9) warnings.push(`${node.name} is saturated at an estimated ${Math.round(utilization * 100)}% utilisation.`);
  }
  const secondPass = runPass(process, iterations, seed, queues);
  const stepMetrics: SimulationStepMetric[] = process.nodes.map((node) => {
    const visit = secondPass.visits.get(node.id) ?? { count: 0, duration: 0, queueWait: 0, cost: 0 };
    const queue = queues.get(node.id);
    return {
      stepId: node.id,
      stepName: node.name,
      visitCount: visit.count,
      visitRate: visit.count / iterations,
      totalDurationMinutes: visit.duration,
      averageDurationMinutes: visit.count === 0 ? 0 : visit.duration / visit.count,
      totalQueueWaitMinutes: visit.queueWait,
      queueWaitMinutes: queue?.meanWaitMinutes ?? 0,
      utilization: queue?.utilization ?? 0,
      totalCost: visit.cost,
    };
  });
  const sortedDurations = [...secondPass.durations].sort((left, right) => left - right);
  return {
    iterations,
    seed,
    completedCases: secondPass.completedCases,
    failedCases: iterations - secondPass.completedCases,
    completionRate: secondPass.completedCases / iterations,
    averageCycleTimeMinutes: secondPass.durations.reduce((sum, value) => sum + value, 0) / iterations,
    p50Minutes: percentile(sortedDurations, 0.5),
    p95Minutes: percentile(sortedDurations, 0.95),
    averageCost: secondPass.costs.reduce((sum, value) => sum + value, 0) / iterations,
    stepMetrics,
    failures: secondPass.failures,
    warnings,
  };
}
