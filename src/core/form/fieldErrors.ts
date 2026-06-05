import type { ZodError } from 'zod';

export type FieldErrors<TField extends string> = Partial<Record<TField, string>>;
export type DtoFieldErrors<TDto extends object> = FieldErrors<Extract<keyof TDto, string>>;

export function toFieldErrors<TField extends string>(error: ZodError): FieldErrors<TField> {
  const errors: FieldErrors<TField> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && !errors[field as TField]) {
      errors[field as TField] = issue.message;
    }
  }

  return errors;
}

export function toDtoFieldErrors<TDto extends object>(error: ZodError): DtoFieldErrors<TDto> {
  return toFieldErrors<Extract<keyof TDto, string>>(error);
}
