import { useProcessStore } from '../../stores/process-store';
import { getScenario } from '../../domain/scenarios';
import { invalidInputEnvelope } from './shared';
import { jsonSchema, listPoliciesInputSchema } from '../schemas';
import type { ToolDef } from '../types';

export const listPoliciesTool: ToolDef = {
  name: 'list_policies', description: 'Returns the active human-authored policy constraints for main or a scenario so you can plan changes that remain within the allowed guardrails.', inputSchema: jsonSchema(listPoliciesInputSchema), annotations: { readOnlyHint: true }, run: (input) => {
    const parsed = listPoliciesInputSchema.safeParse(input);
    if (!parsed.success) return invalidInputEnvelope(parsed.error.issues);
    const state = useProcessStore.getState();
    const scenario = parsed.data.scenarioId ? getScenario(parsed.data.scenarioId) : undefined;
    if (parsed.data.scenarioId && !scenario) return { ok: false, summary: 'The requested scenario does not exist.', error: { code: 'SCENARIO_NOT_FOUND', message: `No scenario exists with id ${parsed.data.scenarioId}.` }, stateVersion: state.stateVersion };
    return { ok: true, summary: 'Returned the active policy constraints.', data: { policies: (scenario?.process ?? state.process).policies }, stateVersion: state.stateVersion };
  },
};
