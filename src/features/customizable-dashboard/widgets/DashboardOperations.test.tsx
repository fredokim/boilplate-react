import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { DashboardDataSourceRegistryProvider } from '../data/DashboardDataSourceRegistryProvider';
import { dashboardDataSourceRegistry, type DashboardDataSourceRegistry } from '../data/dashboardDataSourceRegistry';
import { createDashboardEventBus } from '../events/dashboardEventBus';
import { DashboardRuntimeProvider } from '../events/DashboardRuntimeProvider';
import { updateDraftLayout, createDashboardBuilderState, enterDashboardEditMode } from '../model/dashboardBuilder';
import { initialDashboard } from '../model/initialDashboard';
import { createDashboardActionGate } from '../permissions/dashboardPermissions';
import { TableWidget } from './TableWidget';
import { WidgetRenderer } from './WidgetRenderer';
import { createWidget, defaultWidgetRegistry } from './widgetRegistry';

describe('dashboard operational boundaries', () => {
  it('blocks viewer mutations even when the action layer is called directly', () => {
    const operation = vi.fn();
    const viewer = createDashboardActionGate('viewer');
    const editor = createDashboardActionGate('editor');

    expect(viewer.execute('edit', operation)).toBeUndefined();
    expect(viewer.execute('save', operation)).toBeUndefined();
    expect(operation).not.toHaveBeenCalled();
    expect(editor.can('edit')).toBe(true);
    expect(editor.can('save')).toBe(true);
    expect(editor.can('import')).toBe(false);
  });

  it('isolates a lazy module failure to its widget', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failedWidget = createWidget('lazy-error', 'lazy-failure', { x: 0, y: 0 });
    const healthyWidget = createWidget('lightweight', 'healthy', { x: 4, y: 0 });

    render(<><WidgetRenderer registry={defaultWidgetRegistry} widget={failedWidget} /><WidgetRenderer registry={defaultWidgetRegistry} widget={healthyWidget} /></>);

    expect(await screen.findByText('This widget could not be displayed.')).toBeInTheDocument();
    expect(screen.getByText('Lightweight widget')).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('isolates a widget runtime error from healthy widgets', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failedWidget = createWidget('runtime-error', 'runtime-failure', { x: 0, y: 0 });
    const healthyWidget = createWidget('lightweight', 'healthy-runtime', { x: 4, y: 0 });

    render(<><WidgetRenderer registry={defaultWidgetRegistry} widget={failedWidget} /><WidgetRenderer registry={defaultWidgetRegistry} widget={healthyWidget} /></>);

    expect(screen.getByText('This widget could not be displayed.')).toBeInTheDocument();
    expect(screen.getByText('Lightweight widget')).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('preserves unaffected widget object identities in a 100-widget layout update', () => {
    const widgets = Array.from({ length: 100 }, (_, index) => createWidget('lightweight', `widget-${String(index)}`, { x: index % 4, y: index }));
    const dashboard = { ...initialDashboard, widgets };
    const state = enterDashboardEditMode(createDashboardBuilderState(dashboard));
    const before = state.draft?.widgets ?? [];
    const updated = updateDraftLayout(state, [{ id: 'widget-0', position: { x: 6, y: 0 }, width: 4, height: 2 }]);
    const after = updated.draft?.widgets ?? [];

    expect(after[0]).not.toBe(before[0]);
    expect(after.slice(1).every((widget, index) => widget === before[index + 1])).toBe(true);
  });

  it('renders only a visible window for a 10,000-row table', async () => {
    const tableWidget = initialDashboard.widgets.find((widget) => widget.type === 'table');
    if (tableWidget?.type !== 'table') throw new Error('Expected table widget');
    const largeRegistry: DashboardDataSourceRegistry = {
      ...dashboardDataSourceRegistry,
      'recent-events': {
        ...dashboardDataSourceRegistry['recent-events'],
        load: async () => ({
          kind: 'table',
          columns: [{ key: 'event', label: 'Event' }, { key: 'owner', label: 'Owner' }, { key: 'status', label: 'Status' }],
          rows: Array.from({ length: 10_000 }, (_, index) => ({ id: `row-${String(index)}`, event: `Event ${String(index)}`, owner: 'Owner', status: 'Complete' })),
        }),
      },
    };
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <DashboardDataSourceRegistryProvider registry={largeRegistry}>
          <DashboardRuntimeProvider dashboard={{ ...initialDashboard, widgets: [tableWidget] }} eventBus={createDashboardEventBus()}>
            <TableWidget widget={tableWidget} />
          </DashboardRuntimeProvider>
        </DashboardDataSourceRegistryProvider>
      </QueryClientProvider>,
    );

    const finalVisibleRow = await screen.findByText(/Rendered rows:/);
    const renderedCount = Number(/Rendered rows: (\d+)/.exec(finalVisibleRow.textContent)?.[1]);
    expect(renderedCount).toBeGreaterThan(0);
    expect(renderedCount).toBeLessThan(100);
    expect(screen.queryByText('Event 9999')).not.toBeInTheDocument();
  });

  it('exposes actions according to registry capabilities', () => {
    expect(defaultWidgetRegistry.get('kpi').capabilities).toMatchObject({ refreshable: true, filterable: true });
    expect(defaultWidgetRegistry.get('lightweight').capabilities).toMatchObject({ refreshable: false, filterable: false });
  });
});
