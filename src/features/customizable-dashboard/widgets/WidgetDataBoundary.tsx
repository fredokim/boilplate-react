import { describeFailure } from '@core/result/failureStatus';
import type { PropsWithChildren } from 'react';

type WidgetDataBoundaryProps = PropsWithChildren<{
  error: Error | null;
  isEmpty: boolean;
  isPending: boolean;
  /** Offered only where trying again could plausibly work. */
  onRetry?: () => void;
}>;

/**
 * Says which failure this is.
 *
 * Every error used to render the same four words, "Widget data unavailable",
 * whether the device was offline, the session had ended, or the server had
 * answered in a shape the page cannot read. Those need different things from
 * the reader -- wait, sign in, tell someone -- and the widget was telling them
 * apart internally and then throwing the distinction away at the last step.
 */
export function WidgetDataBoundary({ children, error, isEmpty, isPending, onRetry }: WidgetDataBoundaryProps) {
  if (isPending) {
    return <div className="widget-data-state">Loading widget data…</div>;
  }

  if (error) {
    const status = describeFailure(error);

    return (
      <div className={`widget-data-state widget-data-state--${status.tone}`} role="status">
        <strong className="widget-data-state__title">{status.title}</strong>
        <span className="widget-data-state__detail">{status.detail}</span>
        {status.retryable && onRetry ? (
          <button className="widget-data-state__retry" onClick={onRetry} type="button">
            Try again
          </button>
        ) : null}
      </div>
    );
  }

  if (isEmpty) {
    return <div className="widget-data-state">No widget data</div>;
  }

  return <>{children}</>;
}
