import type { z } from 'zod';

import type { PolicyOperation, PolicyViolation } from '../policies';
import type { Actor, BusinessProcess } from '../../types/process';

export interface CommandContext {
  actor: Actor;
  scenarioId?: string;
}

export type CommandErrorCode =
  | 'INVALID_INPUT'
  | 'STEP_NOT_FOUND'
  | 'EDGE_NOT_FOUND'
  | 'DUPLICATE_EDGE'
  | 'SELF_LOOP'
  | 'END_HAS_OUTGOING'
  | 'POLICY_VIOLATION'
  | 'LIMIT_EXCEEDED'
  | 'BATCH_FAILED'
  | 'SCENARIO_NOT_FOUND';

export interface CommandError {
  code: CommandErrorCode;
  message: string;
  details?: unknown;
  suggestion?: string;
}

export interface CommandResult<TData = unknown> {
  ok: boolean;
  stateVersion: number;
  data?: TData;
  error?: CommandError;
  warnings?: PolicyViolation[];
}

export interface CommandChange<TData = unknown> {
  kind: string;
  entityIds: string[];
  summary: string;
  before?: unknown;
  after?: unknown;
  data?: TData;
}

export interface CommandDefinition<TInput, TData = unknown> {
  schema: z.ZodType<TInput>;
  checkReferences?: (process: BusinessProcess, input: TInput) => CommandError | null;
  checkLimits?: (process: BusinessProcess, input: TInput) => CommandError | null;
  operation: (
    process: BusinessProcess,
    input: TInput,
    ctx: CommandContext,
  ) => PolicyOperation;
  apply: (
    process: BusinessProcess,
    input: TInput,
    now: string,
    ctx: CommandContext,
  ) => void;
  change: (
    before: BusinessProcess,
    after: BusinessProcess,
    input: TInput,
  ) => CommandChange<TData>;
}
