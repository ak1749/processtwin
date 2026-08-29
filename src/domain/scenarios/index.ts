import { nanoid } from 'nanoid';

import { useProcessStore } from '../../stores/process-store';
import { useScenarioStore } from '../../stores/scenario-store';
import { useSimulationStore } from '../../stores/simulation-store';
import { simulateProcess } from '../simulation/simulate';
import type { Actor, BusinessProcess, ProcessConnection, ProcessPolicy, ProcessStep } from '../../types/process';
import type { Scenario, ScenarioDiff } from './types';

export type { Scenario, ScenarioDiff } from './types';

function cloneProcess(process: BusinessProcess): BusinessProcess {
  return structuredClone(process);
}

export function getScenario(id: string): Scenario | undefined {
  return useScenarioStore.getState().scenarios.find((scenario) => scenario.id === id);
}

export function scenarioStatus(scenario: Scenario): Scenario['status'] {
  if (scenario.status !== 'open') return scenario.status;
  return useProcessStore.getState().stateVersion > scenario.baseVersion ? 'stale' : 'open';
}

export function forkScenario(title: string, reason: string, createdBy: Actor = 'agent'): Scenario | null {
  const processState = useProcessStore.getState();
  const openCount = useScenarioStore.getState().scenarios.filter((scenario) => scenarioStatus(scenario) === 'open').length;
  if (openCount >= 5) return null;
  const scenario: Scenario = {
    id: nanoid(),
    title,
    reason,
    createdBy,
    baseVersion: processState.stateVersion,
    process: cloneProcess(processState.process),
    status: 'open',
  };
  useScenarioStore.getState().addScenario(scenario);
  return scenario;
}

function changedFields(before: ProcessStep, after: ProcessStep): ScenarioDiff['modified'] {
  const fields: Array<keyof ProcessStep> = ['type', 'name', 'description', 'owner', 'duration', 'cost', 'capacityPerHour', 'position'];
  return fields.flatMap((field) => JSON.stringify(before[field]) === JSON.stringify(after[field])
    ? []
    : [{ stepId: before.id, field, before: before[field], after: after[field] }]);
}

function changedEdgeFields(
  before: ProcessConnection,
  after: ProcessConnection,
): ScenarioDiff['edgesModified'][number]['changedFields'] {
  const fields: Array<'source' | 'target' | 'label' | 'condition' | 'probability'> = [
    'source',
    'target',
    'label',
    'condition',
    'probability',
  ];
  return fields.filter((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]));
}

function conflictingPolicies(main: BusinessProcess, scenario: BusinessProcess): ScenarioDiff['policyConflicts'] {
  const mainSteps = new Map(main.nodes.map((step) => [step.id, step]));
  const branchSteps = new Map(scenario.nodes.map((step) => [step.id, step]));
  const conflicts: ProcessPolicy[] = main.policies.filter((policy) => {
    if (policy.rule.kind === 'no_delete') return !branchSteps.has(policy.rule.stepId);
    if (policy.rule.kind === 'lock_step') {
      const before = mainSteps.get(policy.rule.stepId);
      const after = branchSteps.get(policy.rule.stepId);
      return !before || !after || policy.rule.lockedFields.some((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]));
    }
    return false;
  });
  return conflicts.map((policy) => ({ policyId: policy.id, label: policy.label }));
}

export function diffScenario(id: string): ScenarioDiff | null {
  const scenario = getScenario(id);
  if (!scenario) return null;
  const main = useProcessStore.getState().process;
  const mainSteps = new Map(main.nodes.map((step) => [step.id, step]));
  const scenarioSteps = new Map(scenario.process.nodes.map((step) => [step.id, step]));
  const mainEdges = new Map(main.edges.map((edge) => [edge.id, edge]));
  const scenarioEdges = new Map(scenario.process.edges.map((edge) => [edge.id, edge]));
  return {
    added: scenario.process.nodes.filter((step) => !mainSteps.has(step.id)),
    removed: main.nodes.filter((step) => !scenarioSteps.has(step.id)),
    modified: main.nodes.flatMap((step) => {
      const branchStep = scenarioSteps.get(step.id);
      return branchStep ? changedFields(step, branchStep) : [];
    }),
    edgesAdded: scenario.process.edges.filter((edge) => !mainEdges.has(edge.id)),
    edgesRemoved: main.edges.filter((edge) => !scenarioEdges.has(edge.id)),
    edgesModified: main.edges.flatMap((edge) => {
      const scenarioEdge = scenarioEdges.get(edge.id);
      if (!scenarioEdge) return [];
      const fields = changedEdgeFields(edge, scenarioEdge);
      return fields.length > 0 ? [{ edgeId: edge.id, before: edge, after: scenarioEdge, changedFields: fields }] : [];
    }),
    policyConflicts: conflictingPolicies(main, scenario.process),
  };
}

export function requestMerge(id: string, summary: string): Scenario['status'] | null {
  const scenario = getScenario(id);
  if (!scenario) return null;
  const status = scenarioStatus(scenario);
  if (status !== 'open') return status;
  const store = useScenarioStore.getState();
  store.setScenarioMergeSummary(id, summary);
  store.setPendingMergeScenarioId(id);
  return 'open';
}

export function mergeScenario(id: string): { scenario: Scenario; stateVersion: number } | null {
  const scenario = getScenario(id);
  if (!scenario || scenarioStatus(scenario) !== 'open') return null;
  const processStore = useProcessStore.getState();
  const simulationStore = useSimulationStore.getState();
  const baseline = simulationStore.result;
  const merged = cloneProcess(processStore.process);
  merged.nodes = cloneProcess(scenario.process).nodes;
  merged.edges = cloneProcess(scenario.process).edges;
  merged.updatedAt = new Date().toISOString();
  const stateVersion = processStore.commitMutation(merged, {
    actor: 'human',
    kind: 'merge_scenario',
    entityIds: [...merged.nodes.map((node) => node.id), ...merged.edges.map((edge) => edge.id)],
    summary: `Merged scenario ${scenario.title}.`,
    before: processStore.process,
    after: merged,
  });
  const scenarioStore = useScenarioStore.getState();
  scenarioStore.setScenarioStatus(id, 'merged');
  scenarioStore.setPendingMergeScenarioId(null);
  scenarioStore.setActiveScenarioId(null);
  if (baseline) {
    simulationStore.setBaseline({ label: `Before merging ${scenario.title}`, result: baseline });
    simulationStore.setResult(simulateProcess(merged, { iterations: baseline.iterations, seed: baseline.seed }));
  }
  return { scenario, stateVersion };
}

export function discardScenario(id: string): Scenario | null {
  const scenario = getScenario(id);
  if (!scenario) return null;
  const store = useScenarioStore.getState();
  store.setScenarioStatus(id, 'rejected');
  store.setPendingMergeScenarioId(null);
  store.setActiveScenarioId(null);
  return scenario;
}
