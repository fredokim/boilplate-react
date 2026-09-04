import { requestDto } from '@core/api/apiClient';
import type { DataSourceParameter } from './dashboardDataSource';
import { KpiDataDto, SeriesDataDto, TableDataDto } from './dashboardDataSource.dto';

type Parameters = Record<string, DataSourceParameter>;

export const dashboardDataSourceApi = {
  salesSummary: (parameters: Parameters) =>
    requestDto({ method: 'GET', url: '/dashboard/kpi', params: parameters }, KpiDataDto),
  trafficSeries: (parameters: Parameters) =>
    requestDto({ method: 'GET', url: '/dashboard/chart', params: parameters }, SeriesDataDto),
  recentEvents: (parameters: Parameters) =>
    requestDto({ method: 'GET', url: '/dashboard/table', params: parameters }, TableDataDto),
};
