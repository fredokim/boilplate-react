import { createDashboardEventBus } from '../events/dashboardEventBus';
import { createDataSource } from '../data/dashboardDataSource';
import {
  addDraftWidget,
  applyCrossWidgetFilters,
  createDashboardBuilderState,
  enterDashboardEditMode,
  getVisibleDashboard,
  redoDashboardDraft,
  undoDashboardDraft,
  updateGlobalFilters,
  updateLocalFilters,
} from './dashboardBuilder';
import { exportDashboard, importDashboard } from './dashboardSerialization';
import { initialDashboard } from './initialDashboard';
import { createWidget } from '../widgets/widgetRegistry';

describe('dashboard platform contracts', () => {
  it('delivers a widget filter through the event bus and applies it to other opted-in widgets', () => {
    const eventBus = createDashboardEventBus();
    let state = createDashboardBuilderState(initialDashboard);
    eventBus.subscribe((event) => {
      if (event.type === 'FilterChanged' && event.scope === 'cross-widget' && event.sourceWidgetId) {
        state = applyCrossWidgetFilters(state, event.sourceWidgetId, event.filters);
      }
    });

    eventBus.publish({ type: 'FilterChanged', sourceWidgetId: 'revenue-trend', scope: 'cross-widget', filters: { product: 'Fri' } });

    expect(state.saved.widgets.find((widget) => widget.id === 'revenue-trend')?.crossWidgetFilters).toEqual({});
    expect(state.saved.widgets.filter((widget) => widget.id !== 'revenue-trend').every((widget) => widget.crossWidgetFilters.product === 'Fri')).toBe(true);
  });

  it('updates global filters without replacing widget local filters', () => {
    let state = updateLocalFilters(createDashboardBuilderState(initialDashboard), 'monthly-revenue', { product: 'Local product' });
    state = updateGlobalFilters(state, { region: 'apac' });
    state = applyCrossWidgetFilters(state, 'revenue-trend', { product: 'Cross product' });

    const widget = state.saved.widgets.find((item) => item.id === 'monthly-revenue');
    expect(state.saved.globalFilters).toEqual({ region: 'apac' });
    expect(widget?.localFilters).toEqual({ product: 'Local product' });
    expect(widget?.crossWidgetFilters).toEqual({ product: 'Cross product' });
  });

  it('undoes and redoes a snapshot-based dashboard edit', () => {
    const editing = enterDashboardEditMode(createDashboardBuilderState(initialDashboard));
    const added = addDraftWidget(editing, createWidget('kpi', 'undo-target', { x: 0, y: 12 }));
    const undone = undoDashboardDraft(added);
    const redone = redoDashboardDraft(undone);

    expect(getVisibleDashboard(undone).widgets.some((widget) => widget.id === 'undo-target')).toBe(false);
    expect(getVisibleDashboard(redone).widgets.some((widget) => widget.id === 'undo-target')).toBe(true);
  });

  it('round-trips an identical versioned dashboard through export and import', () => {
    const dashboard = {
      ...initialDashboard,
      globalFilters: { region: 'emea', product: 'Enterprise' },
      widgets: initialDashboard.widgets.map((widget, index) => index === 0
        ? { ...widget, localFilters: { product: 'Local' }, dataSource: createDataSource('active-users') }
        : widget),
    };

    expect(importDashboard(exportDashboard(dashboard))).toEqual(dashboard);
  });

  it('rejects JSON without the supported dashboard schema version', () => {
    expect(() => importDashboard(JSON.stringify({ version: 2, globalFilters: {}, widgets: [] })))
      .toThrow('Dashboard schema version 1 is required.');
  });

  it('delivers widget and dashboard refresh requests without coupling to widget implementations', () => {
    const eventBus = createDashboardEventBus();
    const refreshTargets: (string | undefined)[] = [];
    eventBus.subscribe((event) => {
      if (event.type === 'RefreshRequested') refreshTargets.push(event.widgetId);
    });

    eventBus.publish({ type: 'RefreshRequested', widgetId: 'monthly-revenue' });
    eventBus.publish({ type: 'RefreshRequested' });

    expect(refreshTargets).toEqual(['monthly-revenue', undefined]);
  });
});
