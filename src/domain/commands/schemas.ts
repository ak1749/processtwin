import { z } from 'zod';

export const stepTypeSchema = z.enum(['start', 'action', 'decision', 'approval', 'end']);
export const operatorSchema = z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte']);

export const durationSchema = z
  .object({
    minMinutes: z.number().finite().nonnegative(),
    typicalMinutes: z.number().finite().nonnegative(),
    maxMinutes: z.number().finite().nonnegative(),
  })
  .superRefine((duration, context) => {
    if (duration.minMinutes > duration.typicalMinutes) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['typicalMinutes'],
        message: 'Typical duration must be at least the minimum duration.',
      });
    }
    if (duration.typicalMinutes > duration.maxMinutes) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['typicalMinutes'],
        message: 'Typical duration must not exceed the maximum duration.',
      });
    }
  });

export const positionSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

export const conditionSchema = z.object({
  variable: z.string().trim().min(1),
  operator: operatorSchema,
  value: z.union([z.number().finite(), z.boolean(), z.string()]),
});

export const variableSchema = z.discriminatedUnion('kind', [
  z
    .object({
      key: z.string().trim().min(1),
      label: z.string().trim().min(1),
      kind: z.literal('number'),
      dist: z.literal('triangular'),
      min: z.number().finite(),
      typical: z.number().finite(),
      max: z.number().finite(),
    })
    .refine(
      (variable) =>
        variable.min <= variable.typical && variable.typical <= variable.max,
      'A triangular variable must satisfy min ≤ typical ≤ max.',
    ),
  z.object({
    key: z.string().trim().min(1),
    label: z.string().trim().min(1),
    kind: z.literal('boolean'),
    probability: z.number().min(0).max(1),
  }),
  z.object({
    key: z.string().trim().min(1),
    label: z.string().trim().min(1),
    kind: z.literal('constant'),
    value: z.number().finite(),
  }),
]);
