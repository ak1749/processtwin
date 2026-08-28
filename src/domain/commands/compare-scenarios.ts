import { z } from 'zod';

import { diffScenario, getScenario } from '../scenarios';
import { simulateProcess } from '../simulation/simulate';
import { useProcessStore } from '../../stores/process-store';
import type { ScenarioDiff } from '../scenarios';
import type { SimulationResult } from '../../types/simulation';
import type { CommandContext, CommandResult } from './types';

const compareScenarioSchema = z.object({ scenarioId: z.string().trim().min(1) }).strict();

interface ScenarioComparison {
  diff: ScenarioDiff;
  metrics: { seed: number; before: SimulationResult; after: SimulationResult };
}

export function compareProcessScenario(_ctx: CommandContext, input: unknown): CommandResult<ScenarioComparison> {
  const parsed = compareScenarioSchema.safeParse(input);
  const state = useProcessStore.getState();
  if (!parsed.success) return { ok: false, stateVersion: state.stateVersion, error: { code: 'INVALID_INPUT', message: 'The command input is invalid.', details: parsed.error.issues } };

  const scenario = getScenario(parsed.data.scenarioId);
  if (!scenario) {
    return { ok: false, stateVersion: state.stateVersion, error: { code: 'SCENARIO_NOT_FOUND', message: `No scenario exists with id ${parsed.data.scenarioId}.` } };
  }
  const diff = diffScenario(scenario.id);
  if (!diff) return { ok: false, stateVersion: state.stateVersion, error: { code: 'SCENARIO_NOT_FOUND', message: `No scenario exists with id ${scenario.id}.` } };

  const seed = 42;
  return {
    ok: true,
    stateVersion: state.stateVersion,
    data: {
      diff,
      metrics: {
        seed,
        before: simulateProcess(state.process, { iterations: 5000, seed }),
        after: simulateProcess(scenario.process, { iterations: 5000, seed }),
      },
    },
  };
}
