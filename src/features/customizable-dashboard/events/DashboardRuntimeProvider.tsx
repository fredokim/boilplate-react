import { type PropsWithChildren, useMemo } from 'react';
import type { DashboardEventBus } from './dashboardEventBus';
import { mergeDashboardFilters } from '../model/dashboardFilters';
import type { Dashboard } from '../model/dashboardWidget';
import { DashboardRuntimeContext, type DashboardRuntime } from './dashboardRuntimeContext';

export function DashboardRuntimeProvider({
  children,
  dashboard,
  eventBus,
}: PropsWithChildren<{ dashboard: Dashboard; eventBus: DashboardEventBus }>) {
  const runtime = useMemo<DashboardRuntime>(() => ({
    eventBus,
    getEffectiveFilters: (widget) => mergeDashboardFilters(
      widget.filterConfig.useGlobalFilters ? dashboard.globalFilters : {},
      widget.crossWidgetFilters,
      widget.localFilters,
    ),
  }), [dashboard.globalFilters, eventBus]);

  return <DashboardRuntimeContext.Provider value={runtime}>{children}</DashboardRuntimeContext.Provider>;
}
