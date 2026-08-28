import type { Actor, BusinessProcess, ProcessConnection, ProcessStep } from '../../types/process';
import type { SimulationResult } from '../../types/simulation';

export interface Scenario {
  id: string;
  title: string;
  reason: string;
  createdBy: Actor;
  baseVersion: number;
  process: BusinessProcess;
  status: 'open' | 'merged' | 'rejected' | 'stale';
  mergeSummary?: string;
  simulation?: SimulationResult;
}

export interface ScenarioDiff {
  added: ProcessStep[];
  removed: ProcessStep[];
  modified: Array<{ stepId: string; field: string; before: unknown; after: unknown }>;
  edgesAdded: ProcessConnection[];
  edgesRemoved: ProcessConnection[];
  policyConflicts: Array<{ policyId: string; label: string }>;
}
