import type { z } from 'zod';
import { logger } from '@core/observability/logger';

export function parseState<TSchema extends z.ZodType>(schema: TSchema, value: unknown, label: string): z.infer<TSchema> {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    logger.warn(`Invalid state payload: ${label}`, { issues: parsed.error.issues });
    throw parsed.error;
  }

  return parsed.data;
}

export function fallbackState<TSchema extends z.ZodType>(
  schema: TSchema,
  value: unknown,
  fallback: z.infer<TSchema>,
  label: string,
): z.infer<TSchema> {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    logger.warn(`Falling back from invalid state payload: ${label}`, { issues: parsed.error.issues });
    return fallback;
  }

  return parsed.data;
}
