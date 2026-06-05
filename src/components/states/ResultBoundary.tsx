import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';
import type { AppFailure } from '@core/result/failure';

type ResultBoundaryProps = {
  status: 'idle' | 'pending' | 'success' | 'error';
  failure?: AppFailure | undefined;
  isEmpty?: boolean;
  emptyTitle?: string;
  onRetry?: (() => void) | undefined;
  children: React.ReactNode;
};

export function ResultBoundary({
  children,
  emptyTitle = 'No data found',
  failure,
  isEmpty = false,
  onRetry,
  status,
}: ResultBoundaryProps) {
  if (status === 'pending' || status === 'idle') {
    return <LoadingState />;
  }

  if (status === 'error') {
    return <ErrorState failure={failure} onRetry={onRetry} />;
  }

  if (isEmpty) {
    return <EmptyState title={emptyTitle} />;
  }

  return <>{children}</>;
}
