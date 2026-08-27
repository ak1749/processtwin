import { z } from 'zod/v3';
import { zodToJsonSchema } from 'zod-to-json-schema';

import type { JsonSchema } from './types';

const scenarioIdSchema = z.string().trim().min(1).optional();
const zeroDuration = { minMinutes: 0, typicalMinutes: 0, maxMinutes: 0 };
const stepTypeSchema = z.enum(['start', 'action', 'decision', 'approval', 'end']);
const operatorSchema = z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte']);
const durationSchema = z.object({
  minMinutes: z.number().finite().nonnegative(),
  typicalMinutes: z.number().finite().nonnegative(),
  maxMinutes: z.number().finite().nonnegative(),
}).refine(
  (duration) => duration.minMinutes <= duration.typicalMinutes && duration.typicalMinutes <= duration.maxMinutes,
  'Duration must satisfy minMinutes ≤ typicalMinutes ≤ maxMinutes.',
);
const positionSchema = z.object({ x: z.number().finite(), y: z.number().finite() });
const conditionSchema = z.object({
  variable: z.string().trim().min(1),
  operator: operatorSchema,
  value: z.union([z.number().finite(), z.boolean(), z.string()]),
});
const variableSchema = z.union([
  z.object({
    key: z.string().trim().min(1),
    label: z.string().trim().min(1),
    kind: z.literal('number'),
    dist: z.literal('triangular'),
    min: z.number().finite(),
    typical: z.number().finite(),
    max: z.number().finite(),
  }).refine((variable) => variable.min <= variable.typical && variable.typical <= variable.max, 'A triangular variable must satisfy min ≤ typical ≤ max.'),
  z.object({ key: z.string().trim().min(1), label: z.string().trim().min(1), kind: z.literal('boolean'), probability: z.number().min(0).max(1) }),
  z.object({ key: z.string().trim().min(1), label: z.string().trim().min(1), kind: z.literal('constant'), value: z.number().finite() }),
]);

export const getProcessSummaryInputSchema = z.object({}).strict();
export const getProcessGraphInputSchema = z.object({
  stepIds: z.array(z.string().trim().min(1)).min(1).optional(),
  depth: z.number().int().min(0).max(10).optional(),
}).strict();
export const getChangesSinceInputSchema = z.object({
  sinceVersion: z.number().int().nonnegative(),
}).strict();
const createBatchOperationSchema = z.object({
  kind: z.literal('create_step'),
  tempId: z.string().trim().min(1).optional(),
  step: z.object({
    id: z.string().trim().min(1).optional(), type: stepTypeSchema, name: z.string().trim().min(1),
    description: z.string().trim().min(1).optional(), owner: z.string().trim().min(1).optional(),
    duration: durationSchema.default(zeroDuration), cost: z.number().finite().nonnegative().optional(),
    capacityPerHour: z.number().finite().positive().optional(), position: positionSchema.optional(),
  }),
});
const updateStepBatchOperationSchema = z.object({
  kind: z.literal('update_step'), id: z.string().trim().min(1),
  changes: z.object({ type: stepTypeSchema, name: z.string().trim().min(1), description: z.string().trim().min(1).nullable(), owner: z.string().trim().min(1).nullable(), duration: durationSchema, cost: z.number().finite().nonnegative().nullable(), capacityPerHour: z.number().finite().positive().nullable(), position: positionSchema }).partial().refine((changes) => Object.keys(changes).length > 0, 'Provide at least one change.'),
});
const deleteStepBatchOperationSchema = z.object({ kind: z.literal('delete_step'), id: z.string().trim().min(1), confirm: z.boolean().default(false) });
const connectBatchOperationSchema = z.object({
  kind: z.literal('connect_steps'),
  connection: z.object({ id: z.string().trim().min(1).optional(), source: z.string().trim().min(1), target: z.string().trim().min(1), label: z.string().trim().min(1).optional(), condition: conditionSchema.optional(), probability: z.number().min(0).max(1).optional() }),
});
const updateConnectionBatchOperationSchema = z.object({
  kind: z.literal('update_connection'), id: z.string().trim().min(1),
  changes: z.object({ source: z.string().trim().min(1), target: z.string().trim().min(1), label: z.string().trim().min(1).nullable(), condition: conditionSchema.nullable(), probability: z.number().min(0).max(1).nullable() }).partial().refine((changes) => Object.keys(changes).length > 0, 'Provide at least one change.'),
});
const deleteConnectionBatchOperationSchema = z.object({ kind: z.literal('delete_connection'), id: z.string().trim().min(1) });
const setVariableBatchOperationSchema = z.object({ kind: z.literal('set_variable'), variable: variableSchema });
export const batchMutateProcessInputSchema = z.object({
  scenarioId: scenarioIdSchema,
  operations: z.array(z.discriminatedUnion('kind', [createBatchOperationSchema, updateStepBatchOperationSchema, deleteStepBatchOperationSchema, connectBatchOperationSchema, updateConnectionBatchOperationSchema, deleteConnectionBatchOperationSchema, setVariableBatchOperationSchema])).min(1).max(100),
}).strict();
export const createStepInputSchema = z.object({
  scenarioId: scenarioIdSchema,
  id: z.string().trim().min(1).optional(),
  type: stepTypeSchema,
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  owner: z.string().trim().min(1).optional(),
  duration: durationSchema.default(zeroDuration),
  cost: z.number().finite().nonnegative().optional(),
  capacityPerHour: z.number().finite().positive().optional(),
}).strict();
export const updateStepInputSchema = z.object({
  scenarioId: scenarioIdSchema,
  id: z.string().trim().min(1),
  changes: z.object({
    type: stepTypeSchema,
    name: z.string().trim().min(1),
    description: z.string().trim().min(1).nullable(),
    owner: z.string().trim().min(1).nullable(),
    duration: durationSchema,
    cost: z.number().finite().nonnegative().nullable(),
    capacityPerHour: z.number().finite().positive().nullable(),
    position: positionSchema,
  }).partial().refine((changes) => Object.keys(changes).length > 0, 'Provide at least one change.'),
}).strict();
export const connectStepsInputSchema = z.object({
  scenarioId: scenarioIdSchema,
  id: z.string().trim().min(1).optional(),
  source: z.string().trim().min(1),
  target: z.string().trim().min(1),
  label: z.string().trim().min(1).optional(),
  condition: conditionSchema.optional(),
  probability: z.number().min(0).max(1).optional(),
}).strict();
export const updateConnectionInputSchema = z.object({
  scenarioId: scenarioIdSchema,
  id: z.string().trim().min(1),
  changes: z.object({
    source: z.string().trim().min(1),
    target: z.string().trim().min(1),
    label: z.string().trim().min(1).nullable(),
    condition: conditionSchema.nullable(),
    probability: z.number().min(0).max(1).nullable(),
  }).partial().refine((changes) => Object.keys(changes).length > 0, 'Provide at least one change.'),
}).strict();
export const deleteStepInputSchema = z.object({
  scenarioId: scenarioIdSchema,
  id: z.string().trim().min(1),
  confirm: z.boolean().default(false),
}).strict();

export const validateProcessInputSchema = z.object({ scenarioId: scenarioIdSchema }).strict();
export const simulateProcessInputSchema = z.object({
  iterations: z.number().int().min(100).max(50_000).default(5_000),
  seed: z.number().int().default(42),
  scenarioId: scenarioIdSchema,
}).strict();
export const analyzeBottlenecksInputSchema = z.object({
  scenarioId: scenarioIdSchema,
  top: z.number().int().min(1).max(100).optional(),
}).strict();

export function jsonSchema(schema: z.ZodTypeAny): JsonSchema {
  return zodToJsonSchema(schema) as JsonSchema;
}
