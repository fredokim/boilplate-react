import { useDashboardRenderCount, useWidgetRenderCount } from './dashboardPerformanceMetrics';

export function DashboardPerformanceDebugPanel({ selectedWidgetId, widgetCount }: { selectedWidgetId: string | null; widgetCount: number }) {
  const renderCount = useDashboardRenderCount();
  const selectedWidgetRenderCount = useWidgetRenderCount(selectedWidgetId);
  return (
    <aside className="dashboard-performance-debug" aria-label="Dashboard performance debug">
      <strong>Performance debug</strong>
      <span>Widgets: {widgetCount}</span>
      <span>Dashboard renders: {renderCount}</span>
      <span>Selected: {selectedWidgetId ?? 'none'}</span>
      <span>Selected widget renders: {selectedWidgetRenderCount}</span>
    </aside>
  );
}
