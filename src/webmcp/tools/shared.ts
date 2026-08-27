import type { CommandResult } from '../../domain/commands/types';
import { fail, type ToolEnvelope } from '../envelope';

export function commandEnvelope<T>(
  result: CommandResult<T>,
  successSummary: string,
  nextSteps?: string[],
): ToolEnvelope<T> {
  if (!result.ok || !result.data) {
    return {
      ok: false,
      summary: result.error?.message ?? 'The requested process change could not be completed.',
      error: result.error,
      stateVersion: result.stateVersion,
    };
  }

  return {
    ok: true,
    summary: successSummary,
    data: result.data,
    stateVersion: result.stateVersion,
    ...(nextSteps && nextSteps.length > 0 ? { nextSteps } : {}),
  };
}

export function invalidInputEnvelope(issues: unknown): ToolEnvelope<never> {
  const issue = Array.isArray(issues) ? issues[0] : undefined;
  const path = issue && typeof issue === 'object' && 'path' in issue
    ? (issue as { path?: unknown }).path
    : undefined;
  return fail(
    'INVALID_INPUT',
    'The tool input is invalid.',
    { issues, ...(path === undefined ? {} : { fieldPath: path }) },
    'Correct the reported field and retry.',
  );
}
