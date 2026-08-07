import type { Dashboard, DashboardWidget } from './dashboardWidget';

export const DASHBOARD_SCHEMA_VERSION = 1 as const;

function isWidget(value: unknown): value is DashboardWidget {
  return Boolean(
    value && typeof value === 'object'
    && 'id' in value && 'type' in value && 'position' in value
    && 'width' in value && 'height' in value && 'config' in value
    && 'dataSource' in value
    && 'filterConfig' in value
    && 'localFilters' in value && 'crossWidgetFilters' in value,
  );
}

export function isDashboardSchema(value: unknown): value is Dashboard {
  return Boolean(
    value && typeof value === 'object'
    && 'version' in value && value.version === DASHBOARD_SCHEMA_VERSION
    && 'metadata' in value
    && 'globalFilters' in value
    && 'widgets' in value && Array.isArray(value.widgets) && value.widgets.every(isWidget),
  );
}

export function exportDashboard(dashboard: Dashboard): string {
  return JSON.stringify(dashboard, null, 2);
}

export function importDashboard(serializedDashboard: string): Dashboard {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serializedDashboard);
  } catch {
    throw new Error('Dashboard JSON is not valid.');
  }
  if (!isDashboardSchema(parsed)) {
    throw new Error(`Dashboard schema version ${String(DASHBOARD_SCHEMA_VERSION)} is required.`);
  }
  return structuredClone(parsed);
}
