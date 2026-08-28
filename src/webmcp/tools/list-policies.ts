import { listProcessPolicies } from '../../domain/commands/list-policies';
import { commandEnvelope } from './shared';
import { jsonSchema, listPoliciesInputSchema } from '../schemas';
import type { ToolDef } from '../types';

export const listPoliciesTool: ToolDef = {
  name: 'list_policies',
  description: 'Returns the active human-authored policy constraints for main or a scenario so you can plan changes that remain within the allowed guardrails.',
  inputSchema: jsonSchema(listPoliciesInputSchema),
  annotations: { readOnlyHint: true },
  run: (input) => commandEnvelope(listProcessPolicies({ actor: 'agent' }, input), 'Returned the active policy constraints.'),
};
