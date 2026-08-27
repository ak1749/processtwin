import { create } from 'zustand';

import type { SimulationResult } from '../types/simulation';

interface SimulationStore {
  result: SimulationResult | null;
  setResult: (result: SimulationResult) => void;
  clearResult: () => void;
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  result: null,
  setResult: (result) => set({ result }),
  clearResult: () => set({ result: null }),
}));
