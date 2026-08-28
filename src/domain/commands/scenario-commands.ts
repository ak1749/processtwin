import { z } from 'zod';

import { discardScenario, forkScenario, getScenario, mergeScenario, requestMerge, scenarioStatus } from '../scenarios';
import { useProcessStore } from '../../stores/process-store';
import type { CommandContext, CommandResult } from './types';

const forkSchema = z.object({ title: z.string().trim().min(1), reason: z.string().trim().min(1) }).strict();
const scenarioSchema = z.object({ scenarioId: z.string().trim().min(1) }).strict();

function invalid<T>(details: unknown): CommandResult<T> {
  return { ok: false, stateVersion: useProcessStore.getState().stateVersion, error: { code: 'INVALID_INPUT', message: 'The command input is invalid.', details } };
}

export function forkProcessScenario(ctx: CommandContext, input: unknown) {
  const parsed = forkSchema.safeParse(input);
  if (!parsed.success) return invalid<{ scenarioId: string }>(parsed.error.issues);
  const scenario = forkScenario(parsed.data.title, parsed.data.reason, ctx.actor);
  if (!scenario) return { ok: false, stateVersion: useProcessStore.getState().stateVersion, error: { code: 'LIMIT_EXCEEDED', message: 'At most five open scenarios are allowed.', details: { limit: 5 } } } as CommandResult<{ scenarioId: string }>;
  return { ok: true, stateVersion: useProcessStore.getState().stateVersion, data: { scenarioId: scenario.id } } as CommandResult<{ scenarioId: string }>;
}

export function requestScenarioMerge(_ctx: CommandContext, input: unknown): CommandResult<{ status: 'awaiting_human' }> {
  const parsed = scenarioSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);
  const scenario = getScenario(parsed.data.scenarioId);
  if (!scenario) return { ok: false, stateVersion: useProcessStore.getState().stateVersion, error: { code: 'SCENARIO_NOT_FOUND', message: `No scenario exists with id ${parsed.data.scenarioId}.` } };
  if (requestMerge(scenario.id) !== 'open') return { ok: false, stateVersion: useProcessStore.getState().stateVersion, error: { code: 'SCENARIO_STALE', message: 'This scenario is stale and must be re-forked before merging.' } };
  return { ok: true, stateVersion: useProcessStore.getState().stateVersion, data: { status: 'awaiting_human' } };
}

export function discardProcessScenario(_ctx: CommandContext, input: unknown): CommandResult<{ status: 'rejected' }> {
  const parsed = z.object({ scenarioId: z.string().trim().min(1), confirm: z.boolean().default(false) }).strict().safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);
  if (!parsed.data.confirm) return { ok: false, stateVersion: useProcessStore.getState().stateVersion, error: { code: 'INVALID_INPUT', message: 'Discarding a scenario requires confirmation.', details: { confirmationRequired: true }, suggestion: 'Retry with confirm: true.' } };
  if (!discardScenario(parsed.data.scenarioId)) return { ok: false, stateVersion: useProcessStore.getState().stateVersion, error: { code: 'SCENARIO_NOT_FOUND', message: `No scenario exists with id ${parsed.data.scenarioId}.` } };
  return { ok: true, stateVersion: useProcessStore.getState().stateVersion, data: { status: 'rejected' } };
}

export function mergeProcessScenario(_ctx: CommandContext, input: unknown): CommandResult<{ scenarioId: string }> {
  const parsed = scenarioSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);
  const merged = mergeScenario(parsed.data.scenarioId);
  if (!merged) return { ok: false, stateVersion: useProcessStore.getState().stateVersion, error: { code: 'SCENARIO_STALE', message: 'Only a current open scenario can be merged.' } };
  return { ok: true, stateVersion: merged.stateVersion, data: { scenarioId: merged.scenario.id } };
}

export function scenarioMergeStatus(input: unknown): CommandResult<{ status: string; baseVersion: number; currentVersion: number }> {
  const parsed = scenarioSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);
  const scenario = getScenario(parsed.data.scenarioId);
  const stateVersion = useProcessStore.getState().stateVersion;
  if (!scenario) return { ok: false, stateVersion, error: { code: 'SCENARIO_NOT_FOUND', message: `No scenario exists with id ${parsed.data.scenarioId}.` } };
  return { ok: true, stateVersion, data: { status: scenarioStatus(scenario), baseVersion: scenario.baseVersion, currentVersion: stateVersion } };
}
