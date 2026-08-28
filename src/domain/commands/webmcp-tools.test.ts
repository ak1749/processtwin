import { beforeEach, describe, expect, it } from 'vitest';

import { getScenario } from '../scenarios';
import { useActivityStore } from '../../stores/activity-store';
import { createEmptyProcess, useProcessStore } from '../../stores/process-store';
import { useScenarioStore } from '../../stores/scenario-store';
import { useSimulationStore } from '../../stores/simulation-store';
import { allRegisteredTools } from '../../webmcp/tools';

function stringData(value: unknown, key: string): string | null {
  if (!value || typeof value !== 'object' || !(key in value)) return null;
  const result = value as Record<string, unknown>;
  return typeof result[key] === 'string' ? result[key] : null;
}

beforeEach(() => {
  useProcessStore.setState({ process: createEmptyProcess(), stateVersion: 1, past: [], future: [], deltaLog: [] });
  useScenarioStore.setState({ scenarios: [], activeScenarioId: null, pendingMergeScenarioId: null });
  useSimulationStore.getState().clearResult();
  useActivityStore.getState().clear();
});

describe('registered WebMCP tools', () => {
  it('accepts a minimal schema-valid payload without returning INVALID_INPUT', async () => {
    let scenarioId = '';
    const payloadFor: Record<string, () => unknown> = {
      get_process_summary: () => ({}),
      get_process_graph: () => ({}),
      get_changes_since: () => ({ sinceVersion: 0 }),
      batch_mutate_process: () => ({
        operations: [{
          kind: 'create_step',
          step: { id: 'tool-start', type: 'start', name: 'Tool start' },
        }],
      }),
      auto_layout: () => ({}),
      create_step: () => ({ id: 'tool-action', type: 'action', name: 'Tool action' }),
      update_step: () => ({ id: 'tool-action', changes: { name: 'Updated tool action' } }),
      connect_steps: () => ({ id: 'tool-connection', source: 'tool-start', target: 'tool-action' }),
      update_connection: () => ({ id: 'tool-connection', changes: { label: 'Tool connection' } }),
      delete_step: () => ({ id: 'tool-action' }),
      validate_process: () => ({}),
      simulate_process: () => ({ iterations: 100, seed: 42 }),
      list_policies: () => ({}),
      analyze_bottlenecks: () => ({}),
      fork_scenario: () => ({ title: 'Tool scenario', reason: 'Exercise scenario tools' }),
      compare_scenarios: () => ({ scenarioId }),
      request_merge: () => ({ scenarioId, summary: 'Increase capacity to reduce P95.' }),
      get_merge_status: () => ({ scenarioId }),
      discard_scenario: () => ({ scenarioId, confirm: true }),
    };

    for (const tool of allRegisteredTools) {
      const envelope = await tool.run(payloadFor[tool.name]!());
      expect(envelope.error?.code, tool.name).not.toBe('INVALID_INPUT');

      if (tool.name === 'fork_scenario') {
        scenarioId = stringData(envelope.data, 'scenarioId') ?? '';
        expect(scenarioId).not.toBe('');
      }
    }

    expect(getScenario(scenarioId)?.mergeSummary).toBe('Increase capacity to reduce P95.');
  });
});
