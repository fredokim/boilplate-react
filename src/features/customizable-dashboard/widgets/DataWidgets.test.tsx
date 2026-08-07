import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { createDataSource, type DashboardData } from '../data/dashboardDataSource';
import { DashboardDataSourceRegistryProvider } from '../data/DashboardDataSourceRegistryProvider';
import {
  dashboardDataSourceRegistry,
  type DashboardDataSourceRegistry,
} from '../data/dashboardDataSourceRegistry';
import type { ChartWidget as ChartWidgetModel, KpiWidget as KpiWidgetModel, TableWidget as TableWidgetModel } from '../model/dashboardWidget';
import { ChartWidget } from './ChartWidget';
import { KpiWidget } from './KpiWidget';
import { TableWidget } from './TableWidget';
import { server } from '@/test/msw/server';
import { apiScenarios } from '@/test/msw/scenarios';
import { initialDashboard } from '../model/initialDashboard';
import { DashboardRuntimeProvider } from '../events/DashboardRuntimeProvider';
import { createDashboardEventBus } from '../events/dashboardEventBus';

const kpiWidget: KpiWidgetModel = {
  id: 'kpi-test',
  type: 'kpi',
  position: { x: 0, y: 0 },
  width: 4,
  height: 3,
  config: { title: 'Revenue' },
  dataSource: createDataSource('sales-summary'),
  filterConfig: { useGlobalFilters: true, acceptCrossWidgetFilters: true }, localFilters: {}, crossWidgetFilters: {},
};

const chartWidget: ChartWidgetModel = {
  id: 'chart-test',
  type: 'chart',
  position: { x: 4, y: 0 },
  width: 8,
  height: 5,
  config: { title: 'Traffic', chartType: 'line' },
  dataSource: createDataSource('traffic-series'),
  filterConfig: { useGlobalFilters: true, acceptCrossWidgetFilters: true }, localFilters: {}, crossWidgetFilters: {},
};

const tableWidget: TableWidgetModel = {
  id: 'table-test',
  type: 'table',
  position: { x: 0, y: 5 },
  width: 12,
  height: 5,
  config: { title: 'Events' },
  dataSource: createDataSource('recent-events'),
  filterConfig: { useGlobalFilters: true, acceptCrossWidgetFilters: true }, localFilters: {}, crossWidgetFilters: {},
};

const successData: Record<DashboardData['kind'], DashboardData> = {
  kpi: { kind: 'kpi', label: 'Gross revenue', value: 48240, trend: '+12.4%' },
  series: { kind: 'series', points: [{ label: 'Mon', value: 3200 }, { label: 'Tue', value: 4100 }] },
  table: {
    kind: 'table',
    columns: [{ key: 'event', label: 'Event' }, { key: 'owner', label: 'Owner' }, { key: 'status', label: 'Status' }],
    rows: [{ id: 'row-1', event: 'Campaign launched', owner: 'Mina', status: 'Complete' }],
  },
};

function createRegistry(load: (kind: DashboardData['kind']) => Promise<DashboardData>): DashboardDataSourceRegistry {
  const registry: DashboardDataSourceRegistry = { ...dashboardDataSourceRegistry };
  Object.values(dashboardDataSourceRegistry).forEach((definition) => {
    registry[definition.id] = { ...definition, load: () => load(definition.kind) };
  });
  return registry;
}

function renderWidgets(children: React.ReactNode, registry: DashboardDataSourceRegistry = dashboardDataSourceRegistry) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  render(
    <QueryClientProvider client={queryClient}>
      <DashboardDataSourceRegistryProvider registry={registry}>
        <DashboardRuntimeProvider dashboard={{ ...initialDashboard, widgets: [kpiWidget, chartWidget, tableWidget] }} eventBus={createDashboardEventBus()}>
          {children}
        </DashboardRuntimeProvider>
      </DashboardDataSourceRegistryProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

describe('dashboard data widgets', () => {
  it('shows loading while the data request is pending', () => {
    server.use(...apiScenarios.dashboardDataDelayed);
    renderWidgets(<KpiWidget widget={kpiWidget} />);

    expect(screen.getByText('Loading widget data…')).toBeInTheDocument();
  });

  it('shows an error state when the data request fails', async () => {
    server.use(...apiScenarios.dashboardDataError);
    renderWidgets(<KpiWidget widget={kpiWidget} />);

    expect(await screen.findByText('Widget data unavailable')).toBeInTheDocument();
  });

  it('shows an empty state when the data source has no KPI value', async () => {
    server.use(apiScenarios.dashboardKpiEmpty);
    renderWidgets(<KpiWidget widget={kpiWidget} />);

    expect(await screen.findByText('No widget data')).toBeInTheDocument();
  });

  it('renders successful KPI, chart, and table data', async () => {
    renderWidgets(
      <>
        <KpiWidget widget={kpiWidget} />
        <ChartWidget widget={chartWidget} />
        <TableWidget widget={tableWidget} />
      </>,
    );

    expect(await screen.findByText('48,240')).toBeInTheDocument();
    expect(await screen.findByText('Mon')).toBeInTheDocument();
    expect(await screen.findByText('Campaign launched')).toBeInTheDocument();
  });

  it('fetches only once when two widgets use the same query key', async () => {
    const load = vi.fn(() => Promise.resolve<DashboardData>(successData.kpi));
    const queryClient = renderWidgets(
      <>
        <KpiWidget widget={kpiWidget} />
        <KpiWidget widget={{ ...kpiWidget, id: 'same-query-kpi' }} />
      </>,
      createRegistry(load),
    );

    expect(await screen.findAllByText('48,240')).toHaveLength(2);
    expect(load).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(1);
  });
});
