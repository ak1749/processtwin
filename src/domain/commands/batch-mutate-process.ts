import { nanoid } from 'nanoid';
import { z } from 'zod';

import { checkProcessLimit } from '../limits';
import { checkPolicies, type ConnectionChanges, type PolicyOperation, type StepChanges } from '../policies';
import { useActivityStore } from '../../stores/activity-store';
import { useProcessStore, type ProcessChange } from '../../stores/process-store';
import { getScenario, scenarioStatus } from '../scenarios';
import { useScenarioStore } from '../../stores/scenario-store';
import type { BusinessProcess, ProcessConnection, ProcessStep } from '../../types/process';
import { conditionSchema, durationSchema, positionSchema, stepTypeSchema, variableSchema } from './schemas';
import { appendPolicyViolationActivity, edgeNotFoundError, stepNotFoundError } from './shared';
import type { CommandContext, CommandError, CommandResult } from './types';

const zeroDuration = { minMinutes: 0, typicalMinutes: 0, maxMinutes: 0 };

const createOperationSchema = z.object({
  kind: z.literal('create_step'),
  tempId: z.string().trim().min(1).optional(),
  step: z.object({
    id: z.string().trim().min(1).optional(),
    type: stepTypeSchema,
    name: z.string().trim().min(1),
    description: z.string().trim().min(1).optional(),
    owner: z.string().trim().min(1).optional(),
    duration: durationSchema.default(zeroDuration),
    cost: z.number().finite().nonnegative().optional(),
    capacityPerHour: z.number().finite().positive().optional(),
    position: positionSchema.optional(),
  }),
});

const updateStepOperationSchema = z.object({
  kind: z.literal('update_step'),
  id: z.string().trim().min(1),
  changes: z.object({
    type: stepTypeSchema,
    name: z.string().trim().min(1),
    description: z.string().trim().min(1).nullable(),
    owner: z.string().trim().min(1).nullable(),
    duration: durationSchema,
    cost: z.number().finite().nonnegative().nullable(),
    capacityPerHour: z.number().finite().positive().nullable(),
    position: positionSchema,
  }).partial().refine((changes) => Object.keys(changes).length > 0, 'Provide at least one change.'),
});

const deleteStepOperationSchema = z.object({
  kind: z.literal('delete_step'),
  id: z.string().trim().min(1),
  confirm: z.boolean().default(false),
});

const connectOperationSchema = z.object({
  kind: z.literal('connect_steps'),
  connection: z.object({
    id: z.string().trim().min(1).optional(),
    source: z.string().trim().min(1),
    target: z.string().trim().min(1),
    label: z.string().trim().min(1).optional(),
    condition: conditionSchema.optional(),
    probability: z.number().min(0).max(1).optional(),
  }),
});

const updateConnectionOperationSchema = z.object({
  kind: z.literal('update_connection'),
  id: z.string().trim().min(1),
  changes: z.object({
    source: z.string().trim().min(1),
    target: z.string().trim().min(1),
    label: z.string().trim().min(1).nullable(),
    condition: conditionSchema.nullable(),
    probability: z.number().min(0).max(1).nullable(),
  }).partial().refine((changes) => Object.keys(changes).length > 0, 'Provide at least one change.'),
});

const deleteConnectionOperationSchema = z.object({
  kind: z.literal('delete_connection'),
  id: z.string().trim().min(1),
});

const setVariableOperationSchema = z.object({
  kind: z.literal('set_variable'),
  variable: variableSchema,
});

export const batchMutateProcessSchema = z.object({
  scenarioId: z.string().trim().min(1).optional(),
  operations: z.array(z.discriminatedUnion('kind', [
    createOperationSchema,
    updateStepOperationSchema,
    deleteStepOperationSchema,
    connectOperationSchema,
    updateConnectionOperationSchema,
    deleteConnectionOperationSchema,
    setVariableOperationSchema,
  ])).min(1).max(100),
});

type BatchInput = z.infer<typeof batchMutateProcessSchema>;
type BatchOperation = BatchInput['operations'][number];

interface BatchData {
  operationCount: number;
  createdSteps: ProcessStep[];
  createdConnections: ProcessConnection[];
  touchedStepIds: string[];
  aliases: Record<string, string>;
}

function cloneProcess(process: BusinessProcess): BusinessProcess {
  return structuredClone(process);
}

function resolveAlias(value: string, aliases: Record<string, string>): string {
  return aliases[value] ?? value;
}

function errorForOperation(
  process: BusinessProcess,
  operation: BatchOperation,
  aliases: Record<string, string>,
): CommandError | null {
  if (operation.kind === 'create_step') {
    const id = operation.step.id;
    if (id && process.nodes.some((step) => step.id === id)) {
      return { code: 'INVALID_INPUT', message: `A step already exists with id ${id}.`, details: { stepId: id } };
    }
    const limit = checkProcessLimit('nodes', process.nodes.length + 1);
    return limit ? { code: limit.code, message: `The process can contain at most ${limit.limit} nodes.`, details: limit } : null;
  }

  if (operation.kind === 'update_step' || operation.kind === 'delete_step') {
    const id = resolveAlias(operation.id, aliases);
    const step = process.nodes.find((node) => node.id === id);
    if (!step) return stepNotFoundError(process, id);
    if (operation.kind === 'delete_step') {
      const connectedEdges = process.edges.filter((edge) => edge.source === id || edge.target === id);
      if (connectedEdges.length > 2 && !operation.confirm) {
        return {
          code: 'INVALID_INPUT',
          message: 'Deleting this step also removes more than two connections.',
          details: { confirmationRequired: true, connectionCount: connectedEdges.length },
          suggestion: 'Retry with confirm: true to delete this step and its connections.',
        };
      }
    }
    return null;
  }

  if (operation.kind === 'connect_steps') {
    const source = resolveAlias(operation.connection.source, aliases);
    const target = resolveAlias(operation.connection.target, aliases);
    const sourceStep = process.nodes.find((step) => step.id === source);
    if (!sourceStep) return stepNotFoundError(process, source);
    if (!process.nodes.some((step) => step.id === target)) return stepNotFoundError(process, target);
    if (source === target) return { code: 'SELF_LOOP', message: 'A connection cannot point to the same step.' };
    if (sourceStep.type === 'end') return { code: 'END_HAS_OUTGOING', message: 'End steps cannot have outgoing connections.' };
    if (operation.connection.id && process.edges.some((edge) => edge.id === operation.connection.id)) {
      return { code: 'INVALID_INPUT', message: `A connection already exists with id ${operation.connection.id}.`, details: { edgeId: operation.connection.id } };
    }
    if (process.edges.some((edge) => edge.source === source && edge.target === target)) {
      return { code: 'DUPLICATE_EDGE', message: 'A connection already exists between these steps.', details: { source, target } };
    }
    const limit = checkProcessLimit('edges', process.edges.length + 1);
    return limit ? { code: limit.code, message: `The process can contain at most ${limit.limit} connections.`, details: limit } : null;
  }

  if (operation.kind === 'update_connection') {
    const id = resolveAlias(operation.id, aliases);
    const existing = process.edges.find((edge) => edge.id === id);
    if (!existing) return edgeNotFoundError(id);
    const source = resolveAlias(operation.changes.source ?? existing.source, aliases);
    const target = resolveAlias(operation.changes.target ?? existing.target, aliases);
    const sourceStep = process.nodes.find((step) => step.id === source);
    if (!sourceStep) return stepNotFoundError(process, source);
    if (!process.nodes.some((step) => step.id === target)) return stepNotFoundError(process, target);
    if (source === target) return { code: 'SELF_LOOP', message: 'A connection cannot point to the same step.' };
    if (sourceStep.type === 'end') return { code: 'END_HAS_OUTGOING', message: 'End steps cannot have outgoing connections.' };
    if (process.edges.some((edge) => edge.id !== id && edge.source === source && edge.target === target)) {
      return { code: 'DUPLICATE_EDGE', message: 'A connection already exists between these steps.', details: { source, target } };
    }
    return null;
  }

  if (operation.kind === 'delete_connection') {
    const id = resolveAlias(operation.id, aliases);
    return process.edges.some((edge) => edge.id === id) ? null : edgeNotFoundError(id);
  }

  return null;
}

function policyOperation(
  process: BusinessProcess,
  operation: BatchOperation,
  aliases: Record<string, string>,
  actor: CommandContext['actor'],
): PolicyOperation {
  switch (operation.kind) {
    case 'create_step': {
      const id = operation.step.id ?? nanoid();
      return { kind: 'create_step', step: { ...operation.step, id, position: operation.step.position ?? { x: 0, y: 0 }, createdBy: actor, updatedAt: '' } };
    }
    case 'update_step': return { kind: 'update_step', stepId: resolveAlias(operation.id, aliases), changes: operation.changes as StepChanges };
    case 'delete_step': return { kind: 'delete_step', stepId: resolveAlias(operation.id, aliases) };
    case 'connect_steps': {
      const id = operation.connection.id ?? nanoid();
      return { kind: 'connect_steps', connection: { ...operation.connection, id, source: resolveAlias(operation.connection.source, aliases), target: resolveAlias(operation.connection.target, aliases), createdBy: actor } };
    }
    case 'update_connection': return { kind: 'update_connection', connectionId: resolveAlias(operation.id, aliases), changes: operation.changes as ConnectionChanges };
    case 'delete_connection': return { kind: 'delete_connection', connectionId: resolveAlias(operation.id, aliases) };
    case 'set_variable': return { kind: 'set_variable', variable: operation.variable };
  }
}

function applyOperation(
  process: BusinessProcess,
  operation: BatchOperation,
  aliases: Record<string, string>,
  now: string,
  actor: CommandContext['actor'],
  data: BatchData,
): void {
  switch (operation.kind) {
    case 'create_step': {
      const id = operation.step.id ?? nanoid();
      if (operation.tempId) aliases[operation.tempId] = id;
      const step: ProcessStep = { ...operation.step, id, position: operation.step.position ?? { x: 0, y: 0 }, createdBy: actor, updatedAt: now };
      process.nodes.push(step);
      data.createdSteps.push(step);
      data.touchedStepIds.push(id);
      return;
    }
    case 'update_step': {
      const step = process.nodes.find((node) => node.id === resolveAlias(operation.id, aliases));
      if (!step) return;
      for (const [field, change] of Object.entries(operation.changes)) {
        if (change === null) delete step[field as keyof ProcessStep];
        else Object.assign(step, { [field]: change });
      }
      step.updatedAt = now;
      data.touchedStepIds.push(step.id);
      return;
    }
    case 'delete_step': {
      const id = resolveAlias(operation.id, aliases);
      process.nodes = process.nodes.filter((step) => step.id !== id);
      process.edges = process.edges.filter((edge) => edge.source !== id && edge.target !== id);
      data.touchedStepIds.push(id);
      return;
    }
    case 'connect_steps': {
      const connection: ProcessConnection = {
        ...operation.connection,
        id: operation.connection.id ?? nanoid(),
        source: resolveAlias(operation.connection.source, aliases),
        target: resolveAlias(operation.connection.target, aliases),
        createdBy: actor,
      };
      process.edges.push(connection);
      data.createdConnections.push(connection);
      return;
    }
    case 'update_connection': {
      const connection = process.edges.find((edge) => edge.id === resolveAlias(operation.id, aliases));
      if (!connection) return;
      for (const [field, change] of Object.entries(operation.changes)) {
        if (change === null) delete connection[field as keyof ProcessConnection];
        else if (field === 'source' || field === 'target') Object.assign(connection, { [field]: resolveAlias(change as string, aliases) });
        else Object.assign(connection, { [field]: change });
      }
      return;
    }
    case 'delete_connection': {
      const id = resolveAlias(operation.id, aliases);
      process.edges = process.edges.filter((edge) => edge.id !== id);
      return;
    }
    case 'set_variable': {
      const index = process.variables.findIndex((variable) => variable.key === operation.variable.key);
      if (index === -1) process.variables.push(operation.variable);
      else process.variables[index] = operation.variable;
    }
  }
}

function batchFailure(index: number, error: CommandError, stateVersion: number): CommandResult<BatchData> {
  const policyDetails = error.code === 'POLICY_VIOLATION' && error.details && typeof error.details === 'object'
    ? error.details as Record<string, unknown>
    : undefined;
  return {
    ok: false,
    stateVersion,
    error: {
      code: error.code === 'POLICY_VIOLATION' ? 'POLICY_VIOLATION' : 'BATCH_FAILED',
      message: `Batch operation ${index} failed: ${error.message}`,
      details: policyDetails ? { index, ...policyDetails } : { index, reason: error },
      suggestion: error.suggestion,
    },
  };
}

export function batchMutateProcess(ctx: CommandContext, rawInput: unknown): CommandResult<BatchData> {
  const store = useProcessStore.getState();
  const parsed = batchMutateProcessSchema.safeParse(rawInput);
  if (!parsed.success) {
    const operationIssue = parsed.error.issues.find(
      (issue) => issue.path[0] === 'operations' && typeof issue.path[1] === 'number',
    );
    if (operationIssue && typeof operationIssue.path[1] === 'number') {
      return batchFailure(operationIssue.path[1], {
        code: 'INVALID_INPUT',
        message: operationIssue.message,
        details: { issues: parsed.error.issues, fieldPath: operationIssue.path },
        suggestion: 'Correct the reported operation field and retry the whole batch.',
      }, store.stateVersion);
    }
    return { ok: false, stateVersion: store.stateVersion, error: { code: 'INVALID_INPUT', message: 'The command input is invalid.', details: parsed.error.issues } };
  }
  const scenarioId = ctx.scenarioId ?? parsed.data.scenarioId;
  const scenario = scenarioId ? getScenario(scenarioId) : undefined;
  if (scenarioId && !scenario) return { ok: false, stateVersion: store.stateVersion, error: { code: 'SCENARIO_NOT_FOUND', message: `No scenario exists with id ${scenarioId}.` } };
  if (scenario && scenarioStatus(scenario) !== 'open') return { ok: false, stateVersion: store.stateVersion, error: { code: 'SCENARIO_STALE', message: 'This scenario is stale and cannot accept further changes.', suggestion: 'Fork a fresh scenario from the current main process.' } };

  const target = scenario?.process ?? store.process;
  const projected = cloneProcess(target);
  const aliases: Record<string, string> = {};
  const tempIds = new Set<string>();
  const previewData: BatchData = { operationCount: parsed.data.operations.length, createdSteps: [], createdConnections: [], touchedStepIds: [], aliases };
  const now = new Date().toISOString();

  for (let index = 0; index < parsed.data.operations.length; index += 1) {
    const operation = parsed.data.operations[index];
    if (operation.kind === 'create_step' && operation.tempId) {
      if (tempIds.has(operation.tempId)) {
        return batchFailure(index, {
          code: 'INVALID_INPUT',
          message: `The tempId ${operation.tempId} is used more than once.`,
          details: { fieldPath: ['operations', index, 'tempId'] },
          suggestion: 'Use a unique tempId for each created step.',
        }, store.stateVersion);
      }
      tempIds.add(operation.tempId);
    }
    const error = errorForOperation(projected, operation, aliases);
    if (error) return batchFailure(index, error, store.stateVersion);

    const policy = policyOperation(projected, operation, aliases, ctx.actor);
    const violations = checkPolicies(projected, policy);
    if (ctx.actor === 'agent' && violations.length > 0) {
      const violation = violations[0];
      appendPolicyViolationActivity(violation);
      return batchFailure(index, {
        code: 'POLICY_VIOLATION',
        message: violation.message,
        details: { policyId: violation.policyId, label: violation.label, violations },
        suggestion: violation.suggestion,
      }, store.stateVersion);
    }
    applyOperation(projected, operation, aliases, now, ctx.actor, previewData);
  }

  projected.updatedAt = now;
  const entityIds = Array.from(new Set([...previewData.touchedStepIds, ...previewData.createdConnections.map((edge) => edge.id)]));
  const change: ProcessChange = {
    actor: ctx.actor,
    kind: 'batch_mutate_process',
    entityIds,
    summary: `Applied ${previewData.operationCount} process changes in one transaction.`,
    before: target,
    after: projected,
  };
  const stateVersion = scenario
    ? store.stateVersion
    : useProcessStore.getState().commitMutation(projected, change);
  if (scenario) useScenarioStore.getState().updateScenarioProcess(scenario.id, projected);
  useActivityStore.getState().append({
    actor: ctx.actor,
    action: 'batch_mutate_process',
    title: ctx.actor === 'agent'
      ? `✨ Agent built workflow · ${previewData.createdSteps.length} steps · ${previewData.createdConnections.length} connections`
      : `Applied ${previewData.operationCount} process changes in one transaction.`,
    description: `${previewData.operationCount} atomic process changes were applied together.`,
    entityIds,
    undoToken: scenario ? `scenario:${scenario.id}` : `process:${stateVersion}`,
  });
  return { ok: true, stateVersion, data: previewData };
}
