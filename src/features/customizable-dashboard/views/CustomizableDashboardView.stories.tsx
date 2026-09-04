import { lazy, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Meta, StoryObj } from '@storybook/react-vite';
import CustomizableDashboardContainer from '../containers/CustomizableDashboardContainer';
import { createDataSource, type DashboardData } from '../data/dashboardDataSource';
import { DashboardDataSourceRegistryProvider } from '../data/DashboardDataSourceRegistryProvider';
import {
  dashboardDataSourceRegistry,
  type DashboardDataSourceRegistry,
} from '../data/dashboardDataSourceRegistry';
import { initialDashboard } from '../model/initialDashboard';
import type { Dashboard, WidgetType } from '../model/dashboardWidget';
import type { DashboardRole } from '../permissions/dashboardPermissions';
import {
  createDefaultWidgetRegistry,
  createWidget,
  defaultWidgetRegistry,
  type WidgetRegistry,
} from '../widgets/widgetRegistry';
import {
  createFailingDashboardRepository,
  createMemoryDashboardRepository,
} from '../persistence/dashboardRepository';
import { createDashboardPersonalization } from '../personalization/dashboardPersonalization';
import { createMemoryDashboardPersonalizationRepository } from '../personalization/dashboardPersonalizationRepository';

type DataScenario = 'loaded' | 'loading' | 'error' | 'empty' | 'table-1k' | 'table-10k';

type DashboardStoryProps = {
  dashboard: Dashboard;
  initiallyEditing: boolean;
  saveFails: boolean;
  scenario: DataScenario;
  role: DashboardRole;
  registry: WidgetRegistry;
  showPerformanceDebug: boolean;
};

const storyData: Record<DashboardData['kind'], DashboardData> = {
  kpi: { kind: 'kpi', label: 'Gross revenue', value: 48240, trend: '+12.4% from last month' },
  series: {
    kind: 'series',
    points: [
      { label: 'Mon', value: 3200 },
      { label: 'Tue', value: 4100 },
      { label: 'Wed', value: 3800 },
      { label: 'Thu', value: 5200 },
    ],
  },
  table: {
    kind: 'table',
    columns: [
      { key: 'event', label: 'Event' },
      { key: 'owner', label: 'Owner' },
      { key: 'status', label: 'Status' },
    ],
    rows: [
      { id: 'event-1', event: 'Campaign launched', owner: 'Mina', status: 'Complete' },
      { id: 'event-2', event: 'Report generated', owner: 'Alex', status: 'Review' },
    ],
  },
};

const emptyStoryData: Record<DashboardData['kind'], DashboardData> = {
  kpi: { kind: 'kpi', label: 'No result' },
  series: { kind: 'series', points: [] },
  table: { kind: 'table', columns: storyData.table.kind === 'table' ? storyData.table.columns : [], rows: [] },
};

function createStoryDataSourceRegistry(scenario: DataScenario): DashboardDataSourceRegistry {
  const registry: DashboardDataSourceRegistry = { ...dashboardDataSourceRegistry };
  Object.values(dashboardDataSourceRegistry).forEach((definition) => {
    registry[definition.id] = {
      ...definition,
      load: () => {
        if (scenario === 'loading') {
          return new Promise<DashboardData>(() => undefined);
        }
        if (scenario === 'error') {
          return Promise.reject(new Error('Story data source failed.'));
        }
        if ((scenario === 'table-1k' || scenario === 'table-10k') && definition.kind === 'table') {
          const rowCount = scenario === 'table-1k' ? 1_000 : 10_000;
          return Promise.resolve({
            ...storyData.table,
            rows: Array.from({ length: rowCount }, (_, index) => ({
              id: `large-row-${String(index)}`,
              event: `Event ${String(index)}`,
              owner: `Owner ${String(index % 20)}`,
              status: index % 2 === 0 ? 'Complete' : 'Review',
            })),
          });
        }
        return Promise.resolve(scenario === 'empty' ? emptyStoryData[definition.kind] : storyData[definition.kind]);
      },
    };
  });
  return registry;
}

function DashboardStory({ dashboard, initiallyEditing, registry, role, saveFails, scenario, showPerformanceDebug }: DashboardStoryProps) {
  const repository = useMemo(
    () => saveFails ? createFailingDashboardRepository(dashboard, new Error('Simulated persistence failure.')) : createMemoryDashboardRepository(dashboard),
    [dashboard, saveFails],
  );
  const queryClient = useMemo(
    () => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } }),
    [],
  );
  const dataSourceRegistry = useMemo(() => createStoryDataSourceRegistry(scenario), [scenario]);

  return (
    <QueryClientProvider client={queryClient}>
      <DashboardDataSourceRegistryProvider registry={dataSourceRegistry}>
        <CustomizableDashboardContainer
          initialDashboard={dashboard}
          initiallyEditing={initiallyEditing}
          registry={registry}
          repository={repository}
          role={role}
          showPerformanceDebug={showPerformanceDebug}
        />
      </DashboardDataSourceRegistryProvider>
    </QueryClientProvider>
  );
}

function PersonalizationStory() {
  const personalizationRepository = useMemo(() => {
    const personalization = createDashboardPersonalization('story-user', initialDashboard.metadata.id, '2026-08-19T00:00:00.000Z');
    personalization.presets.push({
      id: 'apac-operations',
      name: 'APAC operations',
      createdAt: '2026-08-19T00:00:00.000Z',
      updatedAt: '2026-08-19T00:00:00.000Z',
      override: {
        globalFilters: { region: 'apac' },
        hiddenWidgetIds: ['recent-events'],
        widgetOverrides: {},
        addedWidgets: [],
      },
    });
    return createMemoryDashboardPersonalizationRepository(personalization);
  }, []);
  const queryClient = useMemo(
    () => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } }),
    [],
  );
  const dataSourceRegistry = useMemo(() => createStoryDataSourceRegistry('loaded'), []);

  return (
    <QueryClientProvider client={queryClient}>
      <DashboardDataSourceRegistryProvider registry={dataSourceRegistry}>
        <CustomizableDashboardContainer
          initialDashboard={initialDashboard}
          personalizationRepository={personalizationRepository}
          personalizationUserId="story-user"
        />
      </DashboardDataSourceRegistryProvider>
    </QueryClientProvider>
  );
}

const mixedSizeDashboard: Dashboard = {
  ...initialDashboard,
  widgets: [
    ...initialDashboard.widgets,
    {
      id: 'active-users',
      type: 'kpi',
      position: { x: 0, y: 10 },
      width: 3,
      height: 3,
      config: { title: 'Active users' },
      dataSource: createDataSource('active-users'),
      filterConfig: { useGlobalFilters: true, acceptCrossWidgetFilters: true },
      localFilters: {},
      crossWidgetFilters: {},
    },
    {
      id: 'conversion-chart',
      type: 'chart',
      position: { x: 3, y: 10 },
      width: 9,
      height: 4,
      config: { title: 'Conversion funnel', chartType: 'bar' },
      dataSource: createDataSource('conversion-series'),
      filterConfig: { useGlobalFilters: true, acceptCrossWidgetFilters: true },
      localFilters: {},
      crossWidgetFilters: {},
    },
  ],
};

const crossWidgetFilteringDashboard: Dashboard = {
  ...initialDashboard,
  widgets: initialDashboard.widgets.map((widget) => widget.id === 'revenue-trend'
    ? widget
    : { ...widget, crossWidgetFilters: { product: 'Fri' } }),
};

const refreshDashboard: Dashboard = {
  ...initialDashboard,
  widgets: initialDashboard.widgets.map((widget) => ({
    ...widget,
    dataSource: { ...widget.dataSource, refreshPolicy: { mode: 'interval', intervalMs: 5_000 } },
  })),
};

function createStressDashboard(count: number): Dashboard {
  return {
    ...initialDashboard,
    metadata: { ...initialDashboard.metadata, id: `stress-${String(count)}`, title: `${String(count)} widget stress` },
    widgets: Array.from({ length: count }, (_, index) => {
      const widget = createWidget('lightweight', `stress-widget-${String(index)}`, { x: (index * 3) % 12, y: Math.floor(index / 4) * 2 });
      if (widget.type !== 'lightweight') throw new Error('Expected a lightweight widget.');
      return { ...widget, config: { title: `Widget ${String(index + 1)}`, value: index + 1 } };
    }),
  };
}

function requireInitialWidget(type: WidgetType) {
  const widget = initialDashboard.widgets.find((item) => item.type === type);
  if (!widget) throw new Error(`Initial ${type} widget is required.`);
  return widget;
}

const errorDashboard: Dashboard = {
  ...initialDashboard,
  widgets: [
    requireInitialWidget('kpi'),
    createWidget('runtime-error', 'runtime-error-widget', { x: 4, y: 0 }),
  ],
};

const largeTableDashboard: Dashboard = {
  ...initialDashboard,
  widgets: [requireInitialWidget('table')],
};

const slowChartLoader = async () => {
  await new Promise((resolve) => setTimeout(resolve, 2_000));
  return import('../widgets/ChartWidgetPlugin');
};
const lazyStoryRegistry = createDefaultWidgetRegistry();
lazyStoryRegistry.register({
  ...lazyStoryRegistry.get('chart'),
  component: lazy(slowChartLoader),
  lazyLoader: slowChartLoader,
});
const lazyDashboard: Dashboard = {
  ...initialDashboard,
  widgets: [requireInitialWidget('chart')],
};

const meta = {
  title: 'Features/Customizable Dashboard/CustomizableDashboardView',
  component: DashboardStory,
  args: {
    dashboard: initialDashboard,
    initiallyEditing: false,
    saveFails: false,
    scenario: 'loaded',
    role: 'owner',
    registry: defaultWidgetRegistry,
    showPerformanceDebug: false,
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DashboardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LoadedData: Story = {};
export const LoadingState: Story = { args: { scenario: 'loading' } };
export const ErrorState: Story = { args: { scenario: 'error' } };
export const EmptyState: Story = { args: { scenario: 'empty' } };
export const EditModeWithDataSources: Story = { args: { initiallyEditing: true } };
export const SaveFailure: Story = { args: { initiallyEditing: true, saveFails: true } };
export const MixedWidgetSizes: Story = { args: { dashboard: mixedSizeDashboard } };
export const CrossWidgetFiltering: Story = { args: { dashboard: crossWidgetFilteringDashboard } };
export const UndoRedo: Story = { args: { initiallyEditing: true } };
export const Refresh: Story = { args: { dashboard: refreshDashboard } };
export const ImportExport: Story = { args: { initiallyEditing: true } };
export const ViewerRole: Story = { args: { role: 'viewer' } };
export const EditorRole: Story = { args: { role: 'editor' } };
export const LazyWidgetLoading: Story = { args: { dashboard: lazyDashboard, registry: lazyStoryRegistry } };
export const WidgetError: Story = { args: { dashboard: errorDashboard } };
export const TenWidgetStress: Story = { args: { dashboard: createStressDashboard(10), showPerformanceDebug: true } };
export const FiftyWidgetStress: Story = { args: { dashboard: createStressDashboard(50), showPerformanceDebug: true } };
export const HundredWidgetStress: Story = { args: { dashboard: createStressDashboard(100), showPerformanceDebug: true } };
export const ThousandRowVirtualizedTable: Story = { args: { dashboard: largeTableDashboard, scenario: 'table-1k', showPerformanceDebug: true } };
export const LargeVirtualizedTable: Story = { args: { dashboard: largeTableDashboard, scenario: 'table-10k', showPerformanceDebug: true } };
export const PersonalizedPresets: Story = { render: () => <PersonalizationStory /> };
