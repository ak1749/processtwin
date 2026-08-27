import type { Bottleneck, SimulationResult } from '../../types/simulation';

export function analyzeBottlenecks(result: SimulationResult, top?: number): Bottleneck[] {
  const totalTime = result.stepMetrics.reduce((sum, metric) => sum + metric.totalDurationMinutes, 0);
  const maxDuration = Math.max(0, ...result.stepMetrics.map((metric) => metric.averageDurationMinutes));
  const bottlenecks = result.stepMetrics
    .filter((metric) => metric.visitCount > 0)
    .map((metric) => {
      const totalTimeShare = totalTime === 0 ? 0 : metric.totalDurationMinutes / totalTime;
      const normalisedAverageDuration = maxDuration === 0 ? 0 : metric.averageDurationMinutes / maxDuration;
      const score = 0.4 * totalTimeShare + 0.3 * normalisedAverageDuration + 0.3 * metric.utilization;
      const reasons = [`consumes ${Math.round(totalTimeShare * 100)}% of total cycle time`, `estimated ${Math.round(metric.utilization * 100)}% utilisation`, `average queue wait ${Math.round(metric.queueWaitMinutes)} minutes`];
      return { stepId: metric.stepId, stepName: metric.stepName, score, totalTimeShare, averageDurationMinutes: metric.averageDurationMinutes, utilization: metric.utilization, reasons };
    })
    .sort((left, right) => right.score - left.score || left.stepName.localeCompare(right.stepName));
  return top === undefined ? bottlenecks : bottlenecks.slice(0, top);
}
