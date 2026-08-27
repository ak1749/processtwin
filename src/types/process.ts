export type StepType = 'start' | 'action' | 'decision' | 'approval' | 'end';
export type Actor = 'human' | 'agent' | 'system';

export interface Duration { minMinutes: number; typicalMinutes: number; maxMinutes: number }

export interface ProcessStep {
  id: string;
  type: StepType;
  name: string;
  description?: string;
  owner?: string;
  duration: Duration;              // {0,0,0} for start/end/decision
  cost?: number;
  capacityPerHour?: number;        // omit ⇒ infinite capacity, no queueing
  position: { x: number; y: number };
  createdBy: Actor;
  updatedAt: string;
}

export type Operator = 'eq'|'neq'|'gt'|'gte'|'lt'|'lte';

export interface ProcessConnection {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: { variable: string; operator: Operator; value: number | boolean | string };
  probability?: number;            // used when no condition matches
  createdBy: Actor;
}

// Case variables — sampled once per simulated case, then used by edge conditions.
export type VariableSpec =
  | { key: string; label: string; kind: 'number'; dist: 'triangular'; min: number; typical: number; max: number }
  | { key: string; label: string; kind: 'boolean'; probability: number }
  | { key: string; label: string; kind: 'constant'; value: number };

export interface ProcessPolicy {
  id: string;
  label: string;                   // human-readable, shown on the node and to the agent
  createdBy: Actor;
  rule:
    | { kind: 'lock_step'; stepId: string; lockedFields: (keyof ProcessStep)[] }
    | { kind: 'no_delete'; stepId: string }
    | { kind: 'require_step_on_path'; whenVariable: string; operator: Operator; value: number; requiredStepType: StepType };
}

export interface BusinessProcess {
  id: string;
  name: string;
  nodes: ProcessStep[];
  edges: ProcessConnection[];
  variables: VariableSpec[];
  policies: ProcessPolicy[];
  arrivalRatePerHour: number;      // process-level; drives queueing
  createdAt: string;
  updatedAt: string;
}
