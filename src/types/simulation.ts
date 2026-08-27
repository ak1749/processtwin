export interface SimulationStepMetric {
  stepId: string;
  stepName: string;
  visitCount: number;
  visitRate: number;
  totalDurationMinutes: number;
  averageDurationMinutes: number;
  totalQueueWaitMinutes: number;
  queueWaitMinutes: number;
  utilization: number;
  totalCost: number;
}

export interface SimulationFailure {
  code: 'DEAD_END' | 'VISIT_CAP' | 'NO_START';
  stepId?: string;
}

export interface SimulationResult {
  iterations: number;
  seed: number;
  completedCases: number;
  failedCases: number;
  completionRate: number;
  averageCycleTimeMinutes: number;
  p50Minutes: number;
  p95Minutes: number;
  averageCost: number;
  stepMetrics: SimulationStepMetric[];
  failures: SimulationFailure[];
  warnings: string[];
}

export interface Bottleneck {
  stepId: string;
  stepName: string;
  score: number;
  totalTimeShare: number;
  averageDurationMinutes: number;
  utilization: number;
  reasons: string[];
}
