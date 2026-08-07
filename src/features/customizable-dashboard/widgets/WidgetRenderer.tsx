import { memo, Suspense } from 'react';
import type { DashboardWidget } from '../model/dashboardWidget';
import { recordWidgetRender } from '../performance/dashboardPerformanceMetrics';
import type { WidgetRegistry } from './widgetRegistry';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';

export const WidgetRenderer = memo(function WidgetRenderer({ registry, widget }: { registry: WidgetRegistry; widget: DashboardWidget }) {
  recordWidgetRender(widget.id);
  const Component = registry.get(widget.type).component;
  return (
    <WidgetErrorBoundary>
      <Suspense fallback={<div className="widget-data-state" role="status">Loading widget module…</div>}>
        <Component widget={widget} />
      </Suspense>
    </WidgetErrorBoundary>
  );
});
