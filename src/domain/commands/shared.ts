import { produce } from 'immer';

import { checkPolicies } from '../policies';
import { useActivityStore } from '../../stores/activity-store';
import { useProcessStore } from '../../stores/process-store';
import { getScenario, scenarioStatus } from '../scenarios';
import { useScenarioStore } from '../../stores/scenario-store';
import type { BusinessProcess } from '../../types/process';
import type {
  CommandContext,
  CommandDefinition,
  CommandError,
  CommandResult,
} from './types';

export function stepNotFoundError(
  process: BusinessProcess,
  stepId: string,
): CommandError {
  return {
    code: 'STEP_NOT_FOUND',
    message: `No step exists with id ${stepId}.`,
    details: { stepId, validSteps: validStepDetails(process) },
  };
}

export function edgeNotFoundError(edgeId: string): CommandError {
  return {
    code: 'EDGE_NOT_FOUND',
    message: `No connection exists with id ${edgeId}.`,
    details: { edgeId },
  };
}

function cloneProcess(process: BusinessProcess): BusinessProcess {
  return structuredClone(process);
}

function failure<TData>(
  error: CommandError,
  stateVersion: number,
): CommandResult<TData> {
  return { ok: false, stateVersion, error };
}

export function validStepDetails(process: BusinessProcess): Array<{ id: string; name: string }> {
  return process.nodes.map((step) => ({ id: step.id, name: step.name }));
}

export function executeCommand<TInput, TData>(
  ctx: CommandContext,
  rawInput: unknown,
  definition: CommandDefinition<TInput, TData>,
): CommandResult<TData> {
  const store = useProcessStore.getState();

  // 1. Zod parse.
  const parsed = definition.schema.safeParse(rawInput);
  if (!parsed.success) {
    return failure<TData>(
      {
        code: 'INVALID_INPUT',
        message: 'The command input is invalid.',
        details: parsed.error.issues,
      },
      store.stateVersion,
    );
  }

  const input = parsed.data;

  const scenario = ctx.scenarioId ? getScenario(ctx.scenarioId) : undefined;
  if (ctx.scenarioId && !scenario) {
    return failure<TData>(
      {
        code: 'SCENARIO_NOT_FOUND',
        message: `No scenario exists with id ${ctx.scenarioId}.`,
      },
      store.stateVersion,
    );
  }
  if (scenario && scenarioStatus(scenario) !== 'open') {
    return failure<TData>({ code: 'SCENARIO_STALE', message: 'This scenario is stale and cannot accept further changes.', suggestion: 'Fork a fresh scenario from the current main process.' }, store.stateVersion);
  }
  const target = scenario?.process ?? store.process;

  // 2. Referential checks.
  const referentialError = definition.checkReferences?.(target, input);
  if (referentialError) return failure<TData>(referentialError, store.stateVersion);

  // 3. Limit checks.
  const limitError = definition.checkLimits?.(target, input);
  if (limitError) return failure<TData>(limitError, store.stateVersion);

  // 4. Policy check.
  const warnings = checkPolicies(
    target,
    definition.operation(target, input, ctx),
  );
  if (ctx.actor === 'agent' && warnings.length > 0) {
    return failure<TData>(
      {
        code: 'POLICY_VIOLATION',
        message: warnings[0].message,
        details: warnings,
        suggestion: 'Choose a change that preserves the active policy constraints.',
      },
      store.stateVersion,
    );
  }

  // 5. Apply via immer.
  const before = cloneProcess(target);
  const now = new Date().toISOString();
  const after = produce(target, (draft) => {
    definition.apply(draft, input, now, ctx);
    draft.updatedAt = now;
  });

  const change = definition.change(before, after, input);

  // 6. Bump stateVersion, push undo state, and append a delta record.
  const stateVersion = scenario
    ? store.stateVersion
    : useProcessStore.getState().commitMutation(after, { actor: ctx.actor, kind: change.kind, entityIds: change.entityIds, summary: change.summary, before: change.before, after: change.after });
  if (scenario) useScenarioStore.getState().updateScenarioProcess(scenario.id, after);

  // 7. Append activity event.
  useActivityStore.getState().append({
    actor: ctx.actor,
    action: change.kind,
    title: change.summary,
    entityIds: change.entityIds,
    undoToken: scenario ? `scenario:${scenario.id}` : `process:${stateVersion}`,
  });

  // 8. Return CommandResult.
  return {
    ok: true,
    stateVersion,
    data: change.data,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}
