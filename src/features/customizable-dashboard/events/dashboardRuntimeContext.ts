import { createContext, useContext } from 'react';
import type { DashboardEventBus } from './dashboardEventBus';
import type { DashboardFilterValues } from '../model/dashboardFilters';
import type { DashboardWidget } from '../model/dashboardWidget';

export type DashboardRuntime = {
  eventBus: DashboardEventBus;
  getEffectiveFilters: (widget: DashboardWidget) => DashboardFilterValues;
};

export const DashboardRuntimeContext = createContext<DashboardRuntime | null>(null);

export function useDashboardWidgetRuntime(widget: DashboardWidget) {
  const runtime = useContext(DashboardRuntimeContext);
  if (!runtime) {
    throw new Error('Dashboard widgets must be rendered inside DashboardRuntimeProvider.');
  }

  return {
    effectiveFilters: runtime.getEffectiveFilters(widget),
    publish: runtime.eventBus.publish,
  };
}
