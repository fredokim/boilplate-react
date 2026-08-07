import type { PropsWithChildren } from 'react';

type WidgetDataBoundaryProps = PropsWithChildren<{
  error: Error | null;
  isEmpty: boolean;
  isPending: boolean;
}>;

export function WidgetDataBoundary({ children, error, isEmpty, isPending }: WidgetDataBoundaryProps) {
  if (isPending) {
    return <div className="widget-data-state">Loading widget data…</div>;
  }

  if (error) {
    return <div className="widget-data-state widget-data-state--error">Widget data unavailable</div>;
  }

  if (isEmpty) {
    return <div className="widget-data-state">No widget data</div>;
  }

  return <>{children}</>;
}
