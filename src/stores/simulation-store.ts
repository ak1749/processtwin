import { create } from 'zustand';

import type { SimulationResult } from '../types/simulation';

export interface SimulationBaseline {
  label: string;
  result: SimulationResult;
}

interface SimulationStore {
  result: SimulationResult | null;
  baseline: SimulationBaseline | null;
  setResult: (result: SimulationResult) => void;
  setBaseline: (baseline: SimulationBaseline) => void;
  clearResult: () => void;
  clearBaseline: () => void;
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  result: null,
  baseline: null,
  setResult: (result) => set({ result }),
  setBaseline: (baseline) => set({ baseline: { ...baseline, result: structuredClone(baseline.result) } }),
  clearResult: () => set({ result: null }),
  clearBaseline: () => set({ baseline: null }),
}));
