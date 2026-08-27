import type { BusinessProcess } from '../../types/process';

const now = '2026-01-01T00:00:00.000Z';
const duration = (minMinutes: number, typicalMinutes: number, maxMinutes: number) => ({ minMinutes, typicalMinutes, maxMinutes });

export function createRefundTemplate(): BusinessProcess {
  return {
    id: 'refund-template', name: 'Refund workflow', arrivalRatePerHour: 5, createdAt: now, updatedAt: now, policies: [],
    variables: [
      { key: 'fraudFlag', label: 'Fraud flagged', kind: 'boolean', probability: 0.03 },
      { key: 'amount', label: 'Refund amount', kind: 'number', dist: 'triangular', min: 0, typical: 405, max: 1_000 },
    ],
    nodes: [
      { id: 'start', type: 'start', name: 'Refund requested', duration: duration(0, 0, 0), position: { x: 0, y: 160 }, createdBy: 'system', updatedAt: now },
      { id: 'receive', type: 'action', name: 'Receive request', owner: 'Support', duration: duration(5, 15, 35), cost: 2, position: { x: 180, y: 160 }, createdBy: 'system', updatedAt: now },
      { id: 'fraud-check', type: 'action', name: 'Fraud check', owner: 'Risk', duration: duration(2, 5, 15), cost: 3, position: { x: 360, y: 160 }, createdBy: 'system', updatedAt: now },
      { id: 'investigation', type: 'approval', name: 'Investigation', owner: 'Fraud team', duration: duration(60, 150, 360), cost: 20, capacityPerHour: 2, position: { x: 540, y: 40 }, createdBy: 'system', updatedAt: now },
      { id: 'amount-check', type: 'decision', name: 'Amount check', duration: duration(1, 3, 8), position: { x: 540, y: 220 }, createdBy: 'system', updatedAt: now },
      { id: 'auto-approve', type: 'action', name: 'Auto-approve', owner: 'Rules engine', duration: duration(1, 2, 6), cost: 1, position: { x: 720, y: 280 }, createdBy: 'system', updatedAt: now },
      { id: 'manager-approval', type: 'approval', name: 'Manager approval', owner: 'Refund manager', duration: duration(25, 60, 150), cost: 15, capacityPerHour: 5, position: { x: 720, y: 150 }, createdBy: 'system', updatedAt: now },
      { id: 'issue-refund', type: 'action', name: 'Issue refund', owner: 'Finance', duration: duration(10, 25, 70), cost: 5, position: { x: 900, y: 160 }, createdBy: 'system', updatedAt: now },
      { id: 'end', type: 'end', name: 'Refund complete', duration: duration(0, 0, 0), position: { x: 1080, y: 160 }, createdBy: 'system', updatedAt: now },
    ],
    edges: [
      { id: 'e-start-receive', source: 'start', target: 'receive', createdBy: 'system' },
      { id: 'e-receive-fraud', source: 'receive', target: 'fraud-check', createdBy: 'system' },
      { id: 'e-fraud-investigation', source: 'fraud-check', target: 'investigation', condition: { variable: 'fraudFlag', operator: 'eq', value: true }, createdBy: 'system' },
      { id: 'e-fraud-amount', source: 'fraud-check', target: 'amount-check', condition: { variable: 'fraudFlag', operator: 'eq', value: false }, createdBy: 'system' },
      { id: 'e-investigation-manager', source: 'investigation', target: 'manager-approval', createdBy: 'system' },
      { id: 'e-amount-auto', source: 'amount-check', target: 'auto-approve', condition: { variable: 'amount', operator: 'lt', value: 500 }, createdBy: 'system' },
      { id: 'e-amount-manager-high', source: 'amount-check', target: 'investigation', condition: { variable: 'amount', operator: 'gte', value: 2_000 }, createdBy: 'system' },
      { id: 'e-amount-manager-low', source: 'amount-check', target: 'manager-approval', condition: { variable: 'amount', operator: 'gte', value: 500 }, createdBy: 'system' },
      { id: 'e-auto-issue', source: 'auto-approve', target: 'issue-refund', createdBy: 'system' },
      { id: 'e-manager-issue', source: 'manager-approval', target: 'issue-refund', createdBy: 'system' },
      { id: 'e-issue-end', source: 'issue-refund', target: 'end', createdBy: 'system' },
    ],
  };
}
