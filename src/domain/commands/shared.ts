import { produce } from 'immer';

import { checkPolicies } from '../policies';
import { useActivityStore } from '../../stores/activity-store';
import { useProcessStore } from '../../stores/process-store';
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

  // 2. Referential checks.
  const referentialError = definition.checkReferences?.(store.process, input);
  if (referentialError) return failure<TData>(referentialError, store.stateVersion);

  // 3. Limit checks.
  const limitError = definition.checkLimits?.(store.process, input);
  if (limitError) return failure<TData>(limitError, store.stateVersion);

  // 4. Policy check.
  const warnings = checkPolicies(
    store.process,
    definition.operation(store.process, input, ctx),
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
  const before = cloneProcess(store.process);
  const now = new Date().toISOString();
  const after = produce(store.process, (draft) => {
    definition.apply(draft, input, now, ctx);
    draft.updatedAt = now;
  });

  const change = definition.change(before, after, input);

  // 6. Bump stateVersion, push undo state, and append a delta record.
  const stateVersion = useProcessStore.getState().commitMutation(after, {
    actor: ctx.actor,
    kind: change.kind,
    entityIds: change.entityIds,
    summary: change.summary,
    before: change.before,
    after: change.after,
  });

  // 7. Append activity event.
  useActivityStore.getState().append({
    actor: ctx.actor,
    action: change.kind,
    title: change.summary,
    entityIds: change.entityIds,
    undoToken: `process:${stateVersion}`,
  });

  // 8. Return CommandResult.
  return {
    ok: true,
    stateVersion,
    data: change.data,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}
