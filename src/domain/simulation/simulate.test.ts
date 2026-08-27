import { describe, expect, it } from 'vitest';

import { createRefundTemplate } from '../../data/templates/refund';
import { simulateProcess, calculatePercentile } from './simulate';

describe('simulation', () => {
  it('returns identical output for the same seed', () => {
    const process = createRefundTemplate();
    expect(simulateProcess(process, { iterations: 1_000, seed: 42 })).toEqual(simulateProcess(process, { iterations: 1_000, seed: 42 }));
  });

  it('calculates percentiles on a known array', () => {
    expect(calculatePercentile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(calculatePercentile([1, 2, 3, 4], 0.95)).toBeCloseTo(3.85);
  });

  it('raises queue wait with utilisation', () => {
    const lowUtilisation = createRefundTemplate();
    const highUtilisation = createRefundTemplate();
    const lowManager = lowUtilisation.nodes.find((node) => node.id === 'manager-approval');
    const highManager = highUtilisation.nodes.find((node) => node.id === 'manager-approval');
    if (!lowManager || !highManager) throw new Error('Refund template is incomplete.');
    lowManager.capacityPerHour = 20;
    highManager.capacityPerHour = 3;
    const low = simulateProcess(lowUtilisation, { iterations: 5_000, seed: 42 });
    const high = simulateProcess(highUtilisation, { iterations: 5_000, seed: 42 });
    expect(high.stepMetrics.find((metric) => metric.stepId === 'manager-approval')?.queueWaitMinutes).toBeGreaterThan(low.stepMetrics.find((metric) => metric.stepId === 'manager-approval')?.queueWaitMinutes ?? 0);
  });

  it('lowers P95 when capacity is increased', () => {
    const constrained = createRefundTemplate();
    const expanded = createRefundTemplate();
    const constrainedManager = constrained.nodes.find((node) => node.id === 'manager-approval');
    const expandedManager = expanded.nodes.find((node) => node.id === 'manager-approval');
    if (!constrainedManager || !expandedManager) throw new Error('Refund template is incomplete.');
    constrainedManager.capacityPerHour = 3;
    expandedManager.capacityPerHour = 12;
    expect(simulateProcess(expanded, { iterations: 10_000, seed: 42 }).p95Minutes).toBeLessThan(simulateProcess(constrained, { iterations: 10_000, seed: 42 }).p95Minutes);
  });

  it('terminates loops at the visit cap', () => {
    const process = createRefundTemplate();
    const issueEdge = process.edges.find((edge) => edge.id === 'e-auto-issue');
    if (!issueEdge) throw new Error('Refund template is incomplete.');
    issueEdge.target = 'auto-approve';
    const result = simulateProcess(process, { iterations: 100, seed: 42 });
    expect(result.failures.some((failure) => failure.code === 'VISIT_CAP')).toBe(true);
  });

  it('locks the refund template three-state numbers', () => {
    const stateA = createRefundTemplate();
    const stateB = createRefundTemplate();
    const stateC = createRefundTemplate();
    const stateBManager = stateB.nodes.find((node) => node.id === 'manager-approval');
    const stateCManager = stateC.nodes.find((node) => node.id === 'manager-approval');
    if (!stateBManager || !stateCManager) throw new Error('Refund template is incomplete.');
    stateBManager.duration = { minMinutes: 240, typicalMinutes: 360, maxMinutes: 480 };
    stateCManager.capacityPerHour = 10;
    const select = (process: ReturnType<typeof createRefundTemplate>) => {
      const result = simulateProcess(process, { iterations: 10_000, seed: 42 });
      return { p50Minutes: result.p50Minutes, p95Minutes: result.p95Minutes, manager: result.stepMetrics.find((metric) => metric.stepId === 'manager-approval') };
    };
    expect({ A: select(stateA), B: select(stateB), C: select(stateC) }).toMatchSnapshot();
  });
});
