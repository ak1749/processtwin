import { useProcessStore } from '../../stores/process-store';
import type { BusinessProcess } from '../../types/process';

function cloneProcess(process: BusinessProcess): BusinessProcess {
  return structuredClone(process);
}

export function getCurrentStateVersion(): number {
  return useProcessStore.getState().stateVersion;
}

export function getProcessSummary() {
  const { process, stateVersion } = useProcessStore.getState();
  const startIds = process.nodes.filter((step) => step.type === 'start').map((step) => step.id);
  const endIds = process.nodes.filter((step) => step.type === 'end').map((step) => step.id);

  return {
    name: process.name,
    counts: { steps: process.nodes.length, connections: process.edges.length, variables: process.variables.length },
    startIds,
    endIds,
    steps: process.nodes.map((step) => ({
      id: step.id,
      type: step.type,
      name: step.name,
      owner: step.owner,
      typicalMinutes: step.duration.typicalMinutes,
      capacityPerHour: step.capacityPerHour,
    })),
    activePolicyLabels: process.policies.map((policy) => policy.label),
    validationStatus: 'Validation is available in a later phase.',
    latestSimulationHeadline: 'No simulation has been run.',
    stateVersion,
  };
}

export function getProcessGraph(stepIds?: string[], depth?: number) {
  const { process, stateVersion } = useProcessStore.getState();
  if (!stepIds || stepIds.length === 0) {
    return { process: cloneProcess(process), stateVersion };
  }

  const included = new Set(stepIds);
  const remainingDepth = depth ?? 1;
  let frontier = new Set(stepIds);
  for (let level = 0; level < remainingDepth; level += 1) {
    const next = new Set<string>();
    for (const edge of process.edges) {
      if (frontier.has(edge.source)) next.add(edge.target);
      if (frontier.has(edge.target)) next.add(edge.source);
    }
    Array.from(next).forEach((id) => included.add(id));
    frontier = next;
  }

  return {
    process: {
      ...cloneProcess(process),
      nodes: process.nodes.filter((step) => included.has(step.id)),
      edges: process.edges.filter((edge) => included.has(edge.source) && included.has(edge.target)),
    },
    stateVersion,
  };
}

export function getChangesSince(sinceVersion: number) {
  const { deltaLog, stateVersion } = useProcessStore.getState();
  return {
    changes: deltaLog.filter((record) => record.version > sinceVersion),
    stateVersion,
  };
}
