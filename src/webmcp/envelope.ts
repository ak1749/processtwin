import { getCurrentStateVersion } from '../domain/queries/process-queries';

export type ToolErrorCode =
  | 'INVALID_INPUT'
  | 'STEP_NOT_FOUND'
  | 'EDGE_NOT_FOUND'
  | 'DUPLICATE_EDGE'
  | 'SELF_LOOP'
  | 'END_HAS_OUTGOING'
  | 'POLICY_VIOLATION'
  | 'LIMIT_EXCEEDED'
  | 'BATCH_FAILED'
  | 'SCENARIO_NOT_FOUND'
  | 'SCENARIO_STALE'
  | 'NO_SIMULATION'
  | 'SIMULATION_FAILED';

export interface ToolEnvelope<T = unknown> {
  ok: boolean;
  summary: string;
  data?: T;
  error?: {
    code: ToolErrorCode;
    message: string;
    details?: unknown;
    suggestion?: string;
  };
  stateVersion: number;
  nextSteps?: string[];
}

export function ok<T>(summary: string, data: T, nextSteps?: string[]): ToolEnvelope<T> {
  return {
    ok: true,
    summary,
    data,
    stateVersion: getCurrentStateVersion(),
    ...(nextSteps && nextSteps.length > 0 ? { nextSteps } : {}),
  };
}

export function fail(
  code: ToolErrorCode,
  message: string,
  details?: unknown,
  suggestion?: string,
): ToolEnvelope<never> {
  return {
    ok: false,
    summary: message,
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
      ...(suggestion ? { suggestion } : {}),
    },
    stateVersion: getCurrentStateVersion(),
  };
}
