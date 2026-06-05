import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TypedApiError } from '@core/result/failure';

export async function parseDto<T extends object>(Dto: new () => T, payload: unknown): Promise<T> {
  const instance = plainToInstance(Dto, payload);
  const errors = await validate(instance, {
    forbidUnknownValues: true,
    whitelist: true,
  });

  if (errors.length > 0) {
    throw new TypedApiError({
      origin: 'frontend',
      kind: 'validation',
      message: 'API response did not match the frontend DTO contract.',
      details: errors,
    });
  }

  return instance;
}
