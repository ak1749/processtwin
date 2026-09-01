import { beforeEach, describe, expect, it } from 'vitest';

import { batchMutateProcess } from '../commands/batch-mutate-process';
import { clearProcess } from '../commands/clear-process';
import { deleteStep } from '../commands/delete-step';
import { useActivityStore } from '../../stores/activity-store';
import { createEmptyProcess, useProcessStore } from '../../stores/process-store';
import { useScenarioStore } from '../../stores/scenario-store';
import type { BusinessProcess, ProcessPolicy, ProcessStep } from '../../types/process';

const timestamp = '2026-08-28T00:00:00.000Z';

function step(id: string, type: ProcessStep['type'], name: string): ProcessStep {
  return {
    id,
    type,
    name,
    duration: { minMinutes: 0, typicalMinutes: 0, maxMinutes: 0 },
    position: { x: 0, y: 0 },
    createdBy: 'human',
    updatedAt: timestamp,
  };
}

function setProcess(process: BusinessProcess): void {
  useProcessStore.setState({ process, stateVersion: 1, past: [], future: [], deltaLog: [] });
}

function lockedManagerPolicy(): ProcessPolicy {
  return {
    id: 'manager-lock',
    label: 'Manager Approval is locked',
    createdBy: 'human',
    rule: { kind: 'lock_step', stepId: 'manager', lockedFields: ['name', 'duration', 'capacityPerHour'] },
  };
}

function approvalPathProcess(policies: ProcessPolicy[] = []): BusinessProcess {
  const process = createEmptyProcess();
  return {
    ...process,
    variables: [{ key: 'amount', label: 'Amount', kind: 'number', dist: 'triangular', min: 0, typical: 500, max: 5_000 }],
    policies,
    nodes: [
      step('start', 'start', 'Start'),
      step('decision', 'decision', 'Amount check'),
      step('manager', 'approval', 'Manager Approval'),
      step('auto', 'action', 'Auto approve'),
      step('end', 'end', 'End'),
    ],
    edges: [
      { id: 'start-decision', source: 'start', target: 'decision', createdBy: 'human' },
      { id: 'high-manager', source: 'decision', target: 'manager', condition: { variable: 'amount', operator: 'gt', value: 2_000 }, createdBy: 'human' },
      { id: 'manager-end', source: 'manager', target: 'end', createdBy: 'human' },
      { id: 'low-auto', source: 'decision', target: 'auto', condition: { variable: 'amount', operator: 'lte', value: 2_000 }, createdBy: 'human' },
      { id: 'auto-end', source: 'auto', target: 'end', createdBy: 'human' },
    ],
  };
}

beforeEach(() => {
  useScenarioStore.setState({ scenarios: [], activeScenarioId: null, pendingMergeScenarioId: null });
  useActivityStore.getState().clear();
});

describe('process policy enforcement', () => {
  it('blocks an agent from deleting a locked step and identifies the policy', () => {
    setProcess(approvalPathProcess([lockedManagerPolicy()]));

    const result = deleteStep({ actor: 'agent' }, { id: 'manager', confirm: true });

    expect(result.ok).toBe(false);
    expect(result.error).toMatchObject({ code: 'POLICY_VIOLATION', suggestion: expect.any(String) });
    expect(result.error?.details).toMatchObject({ label: 'Manager Approval is locked' });
    expect(useProcessStore.getState().process.nodes.some((node) => node.id === 'manager')).toBe(true);
    const [activity] = useActivityStore.getState().events;
    expect(activity).toMatchObject({
      actor: 'agent',
      action: 'policy_violation',
      title: 'Agent action blocked by policy · Manager Approval is locked',
    });
    expect(activity?.undoToken).toBeUndefined();
  });

  it('rejects an entire agent batch when one operation deletes a locked step', () => {
    setProcess(approvalPathProcess([lockedManagerPolicy()]));

    const result = batchMutateProcess({ actor: 'agent' }, {
      operations: [
        { kind: 'update_step', id: 'auto', changes: { name: 'Fast-track approval' } },
        { kind: 'delete_step', id: 'manager', confirm: true },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.error).toMatchObject({ code: 'POLICY_VIOLATION', suggestion: expect.any(String) });
    expect(result.error?.details).toMatchObject({ label: 'Manager Approval is locked' });
    expect(useProcessStore.getState().process.nodes.find((node) => node.id === 'auto')?.name).toBe('Auto approve');
    expect(useProcessStore.getState().process.nodes.some((node) => node.id === 'manager')).toBe(true);
    const [activity] = useActivityStore.getState().events;
    expect(activity).toMatchObject({
      actor: 'agent',
      action: 'policy_violation',
      title: 'Agent action blocked by policy · Manager Approval is locked',
    });
    expect(activity?.undoToken).toBeUndefined();
  });

  it('blocks removal of an approval branch required on high-value paths', () => {
    const policy: ProcessPolicy = {
      id: 'high-value-approval',
      label: 'High-value refunds require approval',
      createdBy: 'human',
      rule: { kind: 'require_step_on_path', whenVariable: 'amount', operator: 'gt', value: 2_000, requiredStepType: 'approval' },
    };
    setProcess(approvalPathProcess([policy]));

    const result = deleteStep({ actor: 'agent' }, { id: 'manager', confirm: true });

    expect(result.ok).toBe(false);
    expect(result.error).toMatchObject({ code: 'POLICY_VIOLATION' });
    expect(result.error?.details).toMatchObject({ label: 'High-value refunds require approval' });
    expect(useProcessStore.getState().process.nodes.some((node) => node.id === 'manager')).toBe(true);
  });

  it('allows a human to override the same deletion after receiving a warning', () => {
    setProcess(approvalPathProcess([lockedManagerPolicy()]));

    const result = deleteStep({ actor: 'human' }, { id: 'manager', confirm: true });

    expect(result.ok).toBe(true);
    expect(result.warnings?.[0]).toMatchObject({ label: 'Manager Approval is locked' });
    expect(useProcessStore.getState().process.nodes.some((node) => node.id === 'manager')).toBe(false);
  });

  it('clears policy constraints with a cleared workspace', () => {
    setProcess(approvalPathProcess([lockedManagerPolicy()]));

    const result = clearProcess({ actor: 'human' }, {});

    expect(result.ok).toBe(true);
    expect(useProcessStore.getState().process).toMatchObject({
      nodes: [],
      edges: [],
      variables: [],
      policies: [],
    });
  });
});
