import type { BusinessProcess, ProcessConnection, ProcessStep } from '../../types/process';

export type ValidationSeverity = 'error' | 'warning' | 'suggestion';

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  message: string;
  entityIds: string[];
  suggestedFix?: string;
}

export interface ValidationResult { issues: ValidationIssue[]; valid: boolean }

function issue(code: string, severity: ValidationSeverity, message: string, entityIds: string[], suggestedFix?: string): ValidationIssue {
  return { code, severity, message, entityIds, ...(suggestedFix ? { suggestedFix } : {}) };
}

function traverse(ids: string[], edges: ProcessConnection[], field: 'source' | 'target', nextField: 'target' | 'source'): Set<string> {
  const visited = new Set(ids);
  const queue = [...ids];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const edge of edges) {
      if (edge[field] === current && !visited.has(edge[nextField])) { visited.add(edge[nextField]); queue.push(edge[nextField]); }
    }
  }
  return visited;
}

function cyclicNodeIds(nodes: ProcessStep[], edges: ProcessConnection[]): string[] {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const outgoing = new Map(nodes.map((node) => [node.id, edges.filter((edge) => edge.source === node.id && nodeIds.has(edge.target)).map((edge) => edge.target)]));
  return nodes.filter((node) => {
    const seen = new Set<string>();
    const queue = [...(outgoing.get(node.id) ?? [])];
    while (queue.length > 0) {
      const current = queue.shift() as string;
      if (current === node.id) return true;
      if (seen.has(current)) continue;
      seen.add(current);
      queue.push(...(outgoing.get(current) ?? []));
    }
    return false;
  }).map((node) => node.id);
}

export function validateProcess(process: BusinessProcess): ValidationResult {
  const issues: ValidationIssue[] = [];
  const nodeIds = new Set(process.nodes.map((node) => node.id));
  const starts = process.nodes.filter((node) => node.type === 'start');
  const ends = process.nodes.filter((node) => node.type === 'end');
  if (starts.length === 0) issues.push(issue('NO_START', 'error', 'The process has no start step.', [], 'Add exactly one start step.'));
  if (starts.length > 1) issues.push(issue('MULTIPLE_STARTS', 'error', 'The process has more than one start step.', starts.map((step) => step.id), 'Keep one start step and convert or remove the others.'));
  if (ends.length === 0) issues.push(issue('NO_END', 'error', 'The process has no end step.', [], 'Add at least one end step.'));
  for (const edge of process.edges) {
    const missing = [edge.source, edge.target].filter((id) => !nodeIds.has(id));
    if (missing.length > 0) issues.push(issue('DANGLING_EDGE_REFERENCE', 'error', 'A connection refers to a step that no longer exists.', [edge.id, ...missing], 'Reconnect or delete this connection.'));
  }
  const validEdges = process.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
  if (starts.length > 0) {
    const reachable = traverse(starts.map((step) => step.id), validEdges, 'source', 'target');
    for (const node of process.nodes) if (!reachable.has(node.id)) issues.push(issue('UNREACHABLE_NODE', 'error', `${node.name} is not reachable from a start step.`, [node.id], 'Connect this step to a path from the start.'));
  }
  for (const node of process.nodes) {
    const outgoing = validEdges.filter((edge) => edge.source === node.id);
    if (node.type === 'decision' && outgoing.length < 2) issues.push(issue('DECISION_NEEDS_TWO_OUTGOING', 'error', `${node.name} needs at least two outgoing connections.`, [node.id], 'Add enough outcomes for this decision.'));
    if (node.type === 'end' && outgoing.length > 0) issues.push(issue('END_HAS_OUTGOING', 'error', `${node.name} is an end step but has outgoing connections.`, [node.id, ...outgoing.map((edge) => edge.id)], 'Remove the outgoing connections.'));
    const probabilistic = outgoing.filter((edge) => !edge.condition && edge.probability !== undefined);
    if (probabilistic.length > 0) {
      const total = probabilistic.reduce((sum, edge) => sum + (edge.probability ?? 0), 0);
      if (total < 0.99 || total > 1.01) issues.push(issue('PROBABILITIES_OUT_OF_RANGE', 'error', `Probabilities leaving ${node.name} sum to ${total.toFixed(2)}, not approximately 1.`, [node.id, ...probabilistic.map((edge) => edge.id)], 'Adjust these probabilities so they sum to 1.'));
    }
  }
  if (ends.length > 0) {
    const reachesEnd = traverse(ends.map((step) => step.id), validEdges, 'target', 'source');
    for (const node of process.nodes) if (!reachesEnd.has(node.id)) issues.push(issue('NO_PATH_TO_END', 'warning', `${node.name} has no path to an end step.`, [node.id], 'Connect this step to an end path or remove it.'));
  }
  const cycleIds = cyclicNodeIds(process.nodes, validEdges);
  if (cycleIds.length > 0) issues.push(issue('POTENTIAL_INFINITE_LOOP', 'warning', 'The process contains a cycle that may keep cases running indefinitely.', cycleIds, 'Add an exit path or remove the loop.'));
  for (const node of process.nodes) {
    if (node.type === 'approval' && !node.owner) issues.push(issue('APPROVAL_MISSING_OWNER', 'warning', `${node.name} is an approval step without an owner.`, [node.id], 'Assign the person or team responsible for approval.'));
    if (node.type === 'action' && node.duration.typicalMinutes === 0) issues.push(issue('ACTION_ZERO_DURATION', 'warning', `${node.name} has zero duration.`, [node.id], 'Set a realistic duration range for this action.'));
    if (node.type === 'approval' && !node.capacityPerHour) issues.push(issue('APPROVAL_MISSING_CAPACITY', 'warning', `${node.name} has no capacity, so queueing cannot be estimated.`, [node.id], 'Set the approvals this step can complete per hour.'));
    if (!node.owner && node.type !== 'start' && node.type !== 'end') issues.push(issue('UNOWNED_STEP', 'suggestion', `${node.name} has no owner.`, [node.id], 'Assign an owner so responsibility is visible.'));
    if (node.cost === undefined && node.type !== 'start' && node.type !== 'end' && node.type !== 'decision') issues.push(issue('UNCOSTED_STEP', 'suggestion', `${node.name} has no cost.`, [node.id], 'Add a cost to improve cost estimates.'));
  }
  return { issues, valid: !issues.some((entry) => entry.severity === 'error') };
}
