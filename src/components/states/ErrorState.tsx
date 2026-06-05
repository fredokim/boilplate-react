import { Button } from '@ui/Button';
import type { AppFailure } from '@core/result/failure';

type ErrorStateProps = {
  failure?: AppFailure | undefined;
  title?: string | undefined;
  onRetry?: (() => void) | undefined;
};

export function ErrorState({ failure, onRetry, title = 'Something went wrong' }: ErrorStateProps) {
  return (
    <div className="grid min-h-48 place-items-center rounded-lg border border-red-200 bg-red-50 p-8 text-center">
      <div className="grid max-w-md gap-3">
        <h2 className="m-0 text-lg font-bold text-danger">{title}</h2>
        <p className="m-0 text-sm text-red-700">{failure?.message ?? 'Please retry after checking the request.'}</p>
        {failure ? (
          <p className="m-0 text-xs font-semibold text-red-600">
            {failure.origin} / {failure.kind}
          </p>
        ) : null}
        {onRetry ? <Button onClick={onRetry}>Retry</Button> : null}
      </div>
    </div>
  );
}
