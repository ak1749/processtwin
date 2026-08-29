import { beforeEach, describe, expect, it } from 'vitest';

import { createStep } from '../commands/create-step';
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
});
