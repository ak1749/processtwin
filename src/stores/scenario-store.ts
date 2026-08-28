import { create } from 'zustand';

import type { Scenario } from '../domain/scenarios/types';
import type { BusinessProcess } from '../types/process';

interface ScenarioStore {
  scenarios: Scenario[];
  activeScenarioId: string | null;
  pendingMergeScenarioId: string | null;
  addScenario: (scenario: Scenario) => void;
  updateScenarioProcess: (id: string, process: BusinessProcess) => void;
  setScenarioSimulation: (id: string, simulation: Scenario['simulation']) => void;
  setScenarioStatus: (id: string, status: Scenario['status']) => void;
  setScenarioMergeSummary: (id: string, mergeSummary: string) => void;
  setActiveScenarioId: (id: string | null) => void;
  setPendingMergeScenarioId: (id: string | null) => void;
  removeScenario: (id: string) => void;
}

export const useScenarioStore = create<ScenarioStore>((set) => ({
  scenarios: [],
  activeScenarioId: null,
  pendingMergeScenarioId: null,
  addScenario: (scenario) => set((state) => ({
    scenarios: [...state.scenarios, structuredClone(scenario)],
    activeScenarioId: scenario.id,
  })),
  updateScenarioProcess: (id, process) => set((state) => ({
    scenarios: state.scenarios.map((scenario) => scenario.id === id
      ? { ...scenario, process: structuredClone(process) }
      : scenario),
  })),
  setScenarioSimulation: (id, simulation) => set((state) => ({
    scenarios: state.scenarios.map((scenario) => scenario.id === id ? { ...scenario, simulation } : scenario),
  })),
  setScenarioStatus: (id, status) => set((state) => ({
    scenarios: state.scenarios.map((scenario) => scenario.id === id ? { ...scenario, status } : scenario),
  })),
  setScenarioMergeSummary: (id, mergeSummary) => set((state) => ({
    scenarios: state.scenarios.map((scenario) => scenario.id === id ? { ...scenario, mergeSummary } : scenario),
  })),
  setActiveScenarioId: (activeScenarioId) => set({ activeScenarioId }),
  setPendingMergeScenarioId: (pendingMergeScenarioId) => set({ pendingMergeScenarioId }),
  removeScenario: (id) => set((state) => ({
    scenarios: state.scenarios.filter((scenario) => scenario.id !== id),
    activeScenarioId: state.activeScenarioId === id ? null : state.activeScenarioId,
    pendingMergeScenarioId: state.pendingMergeScenarioId === id ? null : state.pendingMergeScenarioId,
  })),
}));
