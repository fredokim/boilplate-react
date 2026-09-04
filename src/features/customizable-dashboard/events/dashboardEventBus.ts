import type { DashboardFilterValues } from '../model/dashboardFilters';
import type { DashboardWidget } from '../model/dashboardWidget';

export type DashboardEvent =
  | { type: 'WidgetSelected'; widgetId: string }
  | { type: 'FilterChanged'; sourceWidgetId: string | null; scope: 'global' | 'local' | 'cross-widget'; filters: DashboardFilterValues }
  | { type: 'RefreshRequested'; widgetId?: string }
  | { type: 'WidgetConfigChanged'; widget: DashboardWidget };

export type DashboardEventListener = (event: DashboardEvent) => void;

export interface DashboardEventBus {
  publish: (event: DashboardEvent) => void;
  subscribe: (listener: DashboardEventListener) => () => void;
}

export function createDashboardEventBus(): DashboardEventBus {
  const listeners = new Set<DashboardEventListener>();

  return {
    publish: (event) => listeners.forEach((listener) => listener(event)),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
