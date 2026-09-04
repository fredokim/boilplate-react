import type { DashboardData, DashboardDataKind, DashboardDataSourceId, DataSourceParameter } from './dashboardDataSource';
import { dashboardDataSourceApi } from './dashboardDataSourceApi';

export type DashboardDataSourceDefinition = {
  id: DashboardDataSourceId;
  label: string;
  kind: DashboardDataKind;
  load: (parameters: Record<string, DataSourceParameter>) => Promise<DashboardData>;
};

export type DashboardDataSourceRegistry = Record<DashboardDataSourceId, DashboardDataSourceDefinition>;

export const dashboardDataSourceRegistry: DashboardDataSourceRegistry = {
  'sales-summary': {
    id: 'sales-summary',
    label: 'Sales summary',
    kind: 'kpi',
    load: dashboardDataSourceApi.salesSummary,
  },
  'active-users': {
    id: 'active-users',
    label: 'Active users',
    kind: 'kpi',
    load: (parameters) => dashboardDataSourceApi.salesSummary({ ...parameters, metric: 'active-users' }),
  },
  'traffic-series': {
    id: 'traffic-series',
    label: 'Traffic series',
    kind: 'series',
    load: dashboardDataSourceApi.trafficSeries,
  },
  'conversion-series': {
    id: 'conversion-series',
    label: 'Conversion series',
    kind: 'series',
    load: (parameters) => dashboardDataSourceApi.trafficSeries({ ...parameters, metric: 'conversion' }),
  },
  'recent-events': {
    id: 'recent-events',
    label: 'Recent events',
    kind: 'table',
    load: dashboardDataSourceApi.recentEvents,
  },
  'incident-events': {
    id: 'incident-events',
    label: 'Incident events',
    kind: 'table',
    load: (parameters) => dashboardDataSourceApi.recentEvents({ ...parameters, category: 'incident' }),
  },
};

export function getDataSourceOptions(kind: DashboardDataKind) {
  return Object.values(dashboardDataSourceRegistry).filter((definition) => definition.kind === kind);
}
