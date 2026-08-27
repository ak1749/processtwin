import type {
  BusinessProcess,
  Operator,
  ProcessConnection,
  ProcessStep,
  StepType,
  VariableSpec,
} from '../../types/process';

export type StepChanges = Partial<
  Pick<
    ProcessStep,
    | 'type'
    | 'name'
    | 'description'
    | 'owner'
    | 'duration'
    | 'cost'
    | 'capacityPerHour'
    | 'position'
  >
>;

export type ConnectionChanges = Partial<
  Pick<ProcessConnection, 'source' | 'target' | 'label' | 'condition' | 'probability'>
>;

export type PolicyOperation =
  | { kind: 'create_step'; step: ProcessStep }
  | { kind: 'update_step'; stepId: string; changes: StepChanges }
  | { kind: 'delete_step'; stepId: string }
  | { kind: 'connect_steps'; connection: ProcessConnection }
  | { kind: 'update_connection'; connectionId: string; changes: ConnectionChanges }
  | { kind: 'delete_connection'; connectionId: string }
  | { kind: 'set_variable'; variable: VariableSpec }
  | { kind: 'clear_process' };

export interface PolicyViolation {
  policyId: string;
  label: string;
  message: string;
}

function cloneProcess(process: BusinessProcess): BusinessProcess {
  return structuredClone(process);
}

function projectOperation(
  process: BusinessProcess,
  operation: PolicyOperation,
): BusinessProcess {
  const projected = cloneProcess(process);

  switch (operation.kind) {
    case 'create_step':
      projected.nodes.push(operation.step);
      break;
    case 'update_step': {
      const step = projected.nodes.find((node) => node.id === operation.stepId);
      if (step) Object.assign(step, operation.changes);
      break;
    }
    case 'delete_step':
      projected.nodes = projected.nodes.filter((node) => node.id !== operation.stepId);
      projected.edges = projected.edges.filter(
        (edge) => edge.source !== operation.stepId && edge.target !== operation.stepId,
      );
      break;
    case 'connect_steps':
      projected.edges.push(operation.connection);
      break;
    case 'update_connection': {
      const connection = projected.edges.find(
        (edge) => edge.id === operation.connectionId,
      );
      if (connection) Object.assign(connection, operation.changes);
      break;
    }
    case 'delete_connection':
      projected.edges = projected.edges.filter(
        (edge) => edge.id !== operation.connectionId,
      );
      break;
    case 'set_variable': {
      const index = projected.variables.findIndex(
        (variable) => variable.key === operation.variable.key,
      );
      if (index === -1) projected.variables.push(operation.variable);
      else projected.variables[index] = operation.variable;
      break;
    }
    case 'clear_process':
      projected.nodes = [];
      projected.edges = [];
      projected.variables = [];
      break;
  }

  return projected;
}

function compare(value: number | boolean | string, operator: Operator, expected: number | boolean | string): boolean {
  switch (operator) {
    case 'eq':
      return value === expected;
    case 'neq':
      return value !== expected;
    case 'gt':
      return typeof value === 'number' && typeof expected === 'number' && value > expected;
    case 'gte':
      return typeof value === 'number' && typeof expected === 'number' && value >= expected;
    case 'lt':
      return typeof value === 'number' && typeof expected === 'number' && value < expected;
    case 'lte':
      return typeof value === 'number' && typeof expected === 'number' && value <= expected;
  }
}

function candidateValues(operator: Operator, value: number): number[] {
  switch (operator) {
    case 'gt':
      return [value + 1];
    case 'gte':
      return [value];
    case 'lt':
      return [value - 1];
    case 'lte':
      return [value];
    case 'neq':
      return [value - 1, value + 1];
    case 'eq':
      return [value];
  }
}

function edgeCouldMatchRule(
  edge: ProcessConnection,
  whenVariable: string,
  operator: Operator,
  value: number,
): boolean {
  if (!edge.condition || edge.condition.variable !== whenVariable) return true;
  if (typeof edge.condition.value !== 'number') return true;

  return candidateValues(operator, value).some((candidate) =>
    compare(candidate, edge.condition?.operator ?? 'eq', edge.condition?.value ?? candidate),
  );
}

function hasPathWithoutRequiredStep(
  process: BusinessProcess,
  whenVariable: string,
  operator: Operator,
  value: number,
  requiredStepType: StepType,
): boolean {
  const starts = process.nodes.filter((node) => node.type === 'start');
  const byId = new Map(process.nodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, ProcessConnection[]>();

  for (const edge of process.edges) {
    const edges = outgoing.get(edge.source) ?? [];
    edges.push(edge);
    outgoing.set(edge.source, edges);
  }

  const visit = (node: ProcessStep, hasRequiredStep: boolean, seen: Set<string>): boolean => {
    const nextHasRequiredStep = hasRequiredStep || node.type === requiredStepType;
    if (node.type === 'end') return !nextHasRequiredStep;
    if (seen.has(node.id)) return false;

    const nextSeen = new Set(seen);
    nextSeen.add(node.id);

    return (outgoing.get(node.id) ?? []).some((edge) => {
      if (!edgeCouldMatchRule(edge, whenVariable, operator, value)) return false;
      const next = byId.get(edge.target);
      return next ? visit(next, nextHasRequiredStep, nextSeen) : false;
    });
  };

  return starts.some((start) => visit(start, false, new Set<string>()));
}

export function checkPolicies(
  process: BusinessProcess,
  operation: PolicyOperation,
): PolicyViolation[] {
  const projected = projectOperation(process, operation);
  const violations: PolicyViolation[] = [];

  for (const policy of process.policies) {
    const rule = policy.rule;

    if (rule.kind === 'lock_step') {
      if (operation.kind !== 'update_step' || operation.stepId !== rule.stepId) {
        continue;
      }

      const changedFields = Object.keys(operation.changes) as Array<keyof ProcessStep>;
      const lockedField = changedFields.find((field) =>
        rule.lockedFields.includes(field),
      );

      if (lockedField) {
        violations.push({
          policyId: policy.id,
          label: policy.label,
          message: `${policy.label} locks the ${lockedField} field on this step.`,
        });
      }
      continue;
    }

    if (rule.kind === 'no_delete') {
      const deletesProtectedStep =
        (operation.kind === 'delete_step' && operation.stepId === rule.stepId) ||
        (operation.kind === 'clear_process' &&
          process.nodes.some((node) => node.id === rule.stepId));

      if (deletesProtectedStep) {
        violations.push({
          policyId: policy.id,
          label: policy.label,
          message: `${policy.label} prevents this step from being deleted.`,
        });
      }
      continue;
    }

    if (
      hasPathWithoutRequiredStep(
        projected,
        rule.whenVariable,
        rule.operator,
        rule.value,
        rule.requiredStepType,
      )
    ) {
      violations.push({
        policyId: policy.id,
        label: policy.label,
          message: `${policy.label} requires a ${rule.requiredStepType} step on this path.`,
      });
    }
  }

  return violations;
}
