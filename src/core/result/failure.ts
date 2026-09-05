export type FailureOrigin = 'frontend' | 'backend' | 'network' | 'unknown';
export type FailureKind = 'waking' | 'validation' | 'auth' | 'not-found' | 'server' | 'timeout' | 'unknown';

export type AppFailure = {
  origin: FailureOrigin;
  kind: FailureKind;
  message: string;
  status?: number | undefined;
  details?: unknown;
};

export class TypedApiError extends Error {
  readonly failure: AppFailure;

  constructor(failure: AppFailure) {
    super(failure.message);
    this.name = 'TypedApiError';
    this.failure = failure;
  }
}

export function toFailure(error: unknown): AppFailure {
  if (error instanceof TypedApiError) {
    return error.failure;
  }

  if (error instanceof Error) {
    return {
      origin: 'unknown',
      kind: 'unknown',
      message: error.message,
    };
  }

  return {
    origin: 'unknown',
    kind: 'unknown',
    message: 'Unknown error',
    details: error,
  };
}
