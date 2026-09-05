import { memo } from 'react';
import type { KpiWidget as KpiWidgetModel } from '../model/dashboardWidget';
import { useWidgetData } from '../hooks/useWidgetData';
import { WidgetDataBoundary } from './WidgetDataBoundary';
import { useDashboardWidgetRuntime } from '../events/dashboardRuntimeContext';

type KpiWidgetProps = {
  widget: KpiWidgetModel;
};

export const KpiWidget = memo(function KpiWidget({ widget }: KpiWidgetProps) {
  const { effectiveFilters } = useDashboardWidgetRuntime(widget);
  const query = useWidgetData(widget.dataSource, 'kpi', effectiveFilters);
  const isEmpty = query.data?.value === undefined;

  return (
    <div className="flex h-full flex-col">
      <p className="m-0 text-sm font-semibold text-muted">{widget.config.title}</p>
      <WidgetDataBoundary error={query.error} onRetry={() => void query.refetch()} isEmpty={isEmpty} isPending={query.isPending}>
        <div className="mt-auto">
          <p className="m-0 text-xs font-semibold text-muted">{query.data?.label}</p>
          <p className="mb-0 mt-1 text-3xl font-black text-ink">{query.data?.value?.toLocaleString()}</p>
          {query.data?.trend ? (
            <p className="mb-0 mt-2 text-sm font-semibold text-success">{query.data.trend}</p>
          ) : null}
        </div>
      </WidgetDataBoundary>
    </div>
  );
});
