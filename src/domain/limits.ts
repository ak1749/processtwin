export const PROCESS_LIMITS = {
  nodes: 100,
  edges: 250,
  iterations: 50_000,
  batchOperations: 100,
  visitsPerCase: 100,
  openScenarios: 5,
  askHumanTimeoutSeconds: 90,
} as const;

export type ProcessLimit = keyof typeof PROCESS_LIMITS;

export interface LimitExceeded {
  code: 'LIMIT_EXCEEDED';
  limit: number;
  attempted: number;
  resource: ProcessLimit;
}

export function checkProcessLimit(
  resource: ProcessLimit,
  attempted: number,
): LimitExceeded | null {
  const limit = PROCESS_LIMITS[resource];

  if (attempted <= limit) return null;

  return {
    code: 'LIMIT_EXCEEDED',
    limit,
    attempted,
    resource,
  };
}
