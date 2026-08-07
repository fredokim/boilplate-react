import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { DashboardData, KpiData, SeriesData, TableData, WidgetDataSource } from '../data/dashboardDataSource';
import { dashboardDataSourceQueryKey } from '../data/dashboardDataSource';
import { useDashboardDataSourceRegistry } from '../data/dashboardDataSourceRegistryContext';
import type { DashboardFilterValues } from '../model/dashboardFilters';

export function useWidgetData(dataSource: WidgetDataSource, expectedKind: 'kpi', filters?: DashboardFilterValues): UseQueryResult<KpiData>;
export function useWidgetData(dataSource: WidgetDataSource, expectedKind: 'series', filters?: DashboardFilterValues): UseQueryResult<SeriesData>;
export function useWidgetData(dataSource: WidgetDataSource, expectedKind: 'table', filters?: DashboardFilterValues): UseQueryResult<TableData>;
export function useWidgetData(dataSource: WidgetDataSource, expectedKind: DashboardData['kind'], filters: DashboardFilterValues = {}) {
  const registry = useDashboardDataSourceRegistry();
  const definition = registry[dataSource.sourceId];
  const effectiveDataSource = { ...dataSource, parameters: { ...dataSource.parameters, ...filters } };

  const staleTime = dataSource.refreshPolicy?.staleTimeMs;
  const refetchInterval = dataSource.refreshPolicy?.mode === 'interval' ? dataSource.refreshPolicy.intervalMs : undefined;

  return useQuery<DashboardData>({
    queryKey: dashboardDataSourceQueryKey(effectiveDataSource),
    queryFn: async () => {
      const data = await definition.load(effectiveDataSource.parameters);
      if (data.kind !== expectedKind) {
        throw new Error(`Data source ${definition.id} returned ${data.kind}; expected ${expectedKind}.`);
      }
      return data;
    },
    ...(staleTime === undefined ? {} : { staleTime }),
    ...(refetchInterval === undefined ? {} : { refetchInterval }),
  });
}
