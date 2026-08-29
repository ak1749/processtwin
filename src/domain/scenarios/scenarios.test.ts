import { beforeEach, describe, expect, it } from 'vitest';

import { createStep } from '../commands/create-step';
import { connectSteps } from '../commands/connect-steps';
import { compareProcessScenario } from '../commands/compare-scenarios';
import { updateConnection } from '../commands/update-connection';
import { updateStep } from '../commands/update-step';
import { mergeProcessScenario } from '../commands/scenario-commands';
import { simulateProcess } from '../simulation/simulate';
import { createEmptyProcess, useProcessStore } from '../../stores/process-store';
import { useScenarioStore } from '../../stores/scenario-store';
import { useSimulationStore } from '../../stores/simulation-store';
import { forkScenario, getScenario, scenarioStatus } from './index';

beforeEach(() => {
  useProcessStore.setState({ process: createEmptyProcess(), stateVersion: 1, past: [], future: [], deltaLog: [] });
  useScenarioStore.setState({ scenarios: [], activeScenarioId: null, pendingMergeScenarioId: null });
  useSimulationStore.setState({ result: null, baseline: null });
  createStep({ actor: 'human' }, { id: 'step-a', type: 'action', name: 'Review', duration: { minMinutes: 1, typicalMinutes: 2, maxMinutes: 3 } });
});

describe('scenarios', () => {
  it('fork does not mutate main', () => {
    const main = structuredClone(useProcessStore.getState().process);
    const scenario = forkScenario('Capacity trial', 'Test a faster review');
    expect(scenario?.process).toEqual(main);
    expect(scenario?.process).not.toBe(useProcessStore.getState().process);
  });

  it('scenario mutation does not touch main', () => {
    const scenario = forkScenario('Capacity trial', 'Test a faster review');
    updateStep({ actor: 'agent', scenarioId: scenario?.id }, { id: 'step-a', changes: { name: 'Accelerated review' } });
    expect(useProcessStore.getState().process.nodes[0]?.name).toBe('Review');
    expect(getScenario(scenario?.id ?? '')?.process.nodes[0]?.name).toBe('Accelerated review');
  });

  it('merge is one undo entry', () => {
    const scenario = forkScenario('Capacity trial', 'Test a faster review');
    updateStep({ actor: 'agent', scenarioId: scenario?.id }, { id: 'step-a', changes: { name: 'Accelerated review' } });
    const past = useProcessStore.getState().past.length;
    const result = mergeProcessScenario({ actor: 'human' }, { scenarioId: scenario?.id });
    expect(result.ok).toBe(true);
    expect(useProcessStore.getState().past).toHaveLength(past + 1);
    expect(useProcessStore.getState().process.nodes[0]?.name).toBe('Accelerated review');
  });

  it('keeps the pre-merge simulation as a labelled baseline', () => {
    const before = simulateProcess(useProcessStore.getState().process, { iterations: 100, seed: 42 });
    useSimulationStore.getState().setResult(before);
    const scenario = forkScenario('Capacity trial', 'Test a faster review');
    updateStep({ actor: 'agent', scenarioId: scenario?.id }, { id: 'step-a', changes: { duration: { minMinutes: 1, typicalMinutes: 1, maxMinutes: 1 } } });

    const result = mergeProcessScenario({ actor: 'human' }, { scenarioId: scenario?.id });

    expect(result.ok).toBe(true);
    expect(useSimulationStore.getState().baseline).toEqual({ label: 'Before merging Capacity trial', result: before });
    expect(useSimulationStore.getState().result).not.toBeNull();
  });

  it('main moving marks the scenario stale', () => {
    const scenario = forkScenario('Capacity trial', 'Test a faster review');
    updateStep({ actor: 'human' }, { id: 'step-a', changes: { name: 'Main review' } });
    expect(scenarioStatus(getScenario(scenario?.id ?? '')!)).toBe('stale');
  });

  it('reports an edge-condition change as one edge modification', () => {
    createStep({ actor: 'human' }, { id: 'step-b', type: 'action', name: 'Approve' });
    connectSteps({ actor: 'human' }, {
      id: 'approval-route',
      source: 'step-a',
      target: 'step-b',
      condition: { variable: 'refundAmount', operator: 'lt', value: 500 },
    });
    const scenario = forkScenario('Threshold trial', 'Raise the automatic approval threshold');
    updateConnection(
      { actor: 'agent', scenarioId: scenario?.id },
      { id: 'approval-route', changes: { condition: { variable: 'refundAmount', operator: 'lt', value: 2_000 } } },
    );

    const result = compareProcessScenario({ actor: 'agent' }, { scenarioId: scenario?.id });

    expect(result.ok).toBe(true);
    const diff = result.data?.diff;
    expect(diff).toBeDefined();
    if (!diff) return;
    expect(diff.edgesModified).toHaveLength(1);
    expect(diff.edgesModified[0]).toMatchObject({
      edgeId: 'approval-route',
      changedFields: ['condition'],
      before: { condition: { variable: 'refundAmount', operator: 'lt', value: 500 } },
      after: { condition: { variable: 'refundAmount', operator: 'lt', value: 2_000 } },
    });
    expect(diff.edgesAdded).toEqual([]);
    expect(diff.edgesRemoved).toEqual([]);
  });
});
