export type DashboardDataSourceId =
  | 'sales-summary'
  | 'active-users'
  | 'traffic-series'
  | 'conversion-series'
  | 'recent-events'
  | 'incident-events';
export type DashboardDataKind = 'kpi' | 'series' | 'table';
export type DataSourceParameter = string | number | boolean;

export type WidgetDataSource = {
  type: 'api' | 'static' | 'derived';
  sourceId: DashboardDataSourceId;
  parameters: Record<string, DataSourceParameter>;
  refreshPolicy?: {
    mode: 'manual' | 'interval';
    staleTimeMs?: number;
    intervalMs?: 5_000 | 30_000 | 60_000;
  };
};

export type KpiData = {
  kind: 'kpi';
  label: string;
  value?: number;
  trend?: string;
};

export type SeriesPoint = {
  label: string;
  value: number;
};

export type SeriesData = {
  kind: 'series';
  points: SeriesPoint[];
};

export type TableColumn = {
  key: 'event' | 'owner' | 'status';
  label: string;
};

export type TableRow = {
  id: string;
  event: string;
  owner: string;
  status: string;
};

export type TableData = {
  kind: 'table';
  columns: TableColumn[];
  rows: TableRow[];
};

export type DashboardData = KpiData | SeriesData | TableData;

export const dataSourceKindById: Record<DashboardDataSourceId, DashboardDataKind> = {
  'sales-summary': 'kpi',
  'active-users': 'kpi',
  'traffic-series': 'series',
  'conversion-series': 'series',
  'recent-events': 'table',
  'incident-events': 'table',
};

export function createDataSource(sourceId: DashboardDataSourceId): WidgetDataSource {
  return {
    type: 'api',
    sourceId,
    parameters: { scope: 'month' },
    refreshPolicy: { mode: 'manual', staleTimeMs: 60_000 },
  };
}

export function dashboardDataSourceQueryKey(dataSource: WidgetDataSource) {
  const normalizedParameters = Object.fromEntries(
    Object.entries(dataSource.parameters).sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey)),
  );
  return ['dashboard-widget-data', dataSource.type, dataSource.sourceId, normalizedParameters] as const;
}
