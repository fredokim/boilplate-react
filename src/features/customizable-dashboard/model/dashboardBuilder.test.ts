import {
  addDraftWidget,
  cancelDashboardDraft,
  createDashboardBuilderState,
  deleteDraftWidget,
  enterDashboardEditMode,
  getVisibleDashboard,
  replaceDraftWidget,
  saveDashboardDraft,
  updateDraftLayout,
} from './dashboardBuilder';
import { initialDashboard } from './initialDashboard';
import {
  createFailingDashboardRepository,
  createLocalStorageDashboardRepository,
  createMemoryDashboardRepository,
} from '../persistence/dashboardRepository';
import { persistDashboardDraft } from '../persistence/saveDashboardDraft';
import { createDataSource } from '../data/dashboardDataSource';
import { createWidget } from '../widgets/widgetRegistry';

describe('dashboard builder state', () => {
  it('discards moved and resized draft layout on cancel', () => {
    const editingState = enterDashboardEditMode(createDashboardBuilderState(initialDashboard));
    const changedState = updateDraftLayout(editingState, [
      { id: 'monthly-revenue', position: { x: 6, y: 4 }, width: 6, height: 6 },
    ]);

    const cancelledState = cancelDashboardDraft(changedState);

    expect(getVisibleDashboard(cancelledState)).toEqual(initialDashboard);
    expect(cancelledState.draft).toBeNull();
  });

  it('discards a widget added to the draft on cancel', () => {
    const editingState = enterDashboardEditMode(createDashboardBuilderState(initialDashboard));
    const addedState = addDraftWidget(editingState, createWidget('kpi', 'draft-only-widget', { x: 0, y: 8 }));

    const cancelledState = cancelDashboardDraft(addedState);

    expect(cancelledState.saved.widgets).toHaveLength(initialDashboard.widgets.length);
    expect(cancelledState.saved.widgets.some((widget) => widget.id === 'draft-only-widget')).toBe(false);
  });

  it('restores a deleted widget with its original layout and config on cancel', () => {
    const editingState = enterDashboardEditMode(createDashboardBuilderState(initialDashboard));
    const deletedState = deleteDraftWidget(editingState, 'monthly-revenue');

    const cancelledState = cancelDashboardDraft(deletedState);

    expect(getVisibleDashboard(cancelledState).widgets[0]).toEqual(initialDashboard.widgets[0]);
  });

  it('promotes layout and config draft changes to saved state on save', () => {
    const editingState = enterDashboardEditMode(createDashboardBuilderState(initialDashboard));
    const resizedState = updateDraftLayout(editingState, [
      { id: 'monthly-revenue', position: { x: 2, y: 3 }, width: 5, height: 4 },
    ]);
    const kpiWidget = resizedState.draft?.widgets.find((widget) => widget.id === 'monthly-revenue');
    if (kpiWidget?.type !== 'kpi') {
      throw new Error('Expected the KPI widget in the draft');
    }
    const configuredState = replaceDraftWidget(resizedState, {
      ...kpiWidget,
      config: { ...kpiWidget.config, title: 'Saved revenue' },
    });

    const savedState = saveDashboardDraft(configuredState);
    const savedKpi = savedState.saved.widgets.find((widget) => widget.id === 'monthly-revenue');

    expect(savedState.isEditing).toBe(false);
    expect(savedState.draft).toBeNull();
    expect(savedKpi).toMatchObject({ position: { x: 2, y: 3 }, width: 5, height: 4 });
    expect(savedKpi?.config.title).toBe('Saved revenue');
  });

  it('loads the same dashboard from persistence after save', async () => {
    const storageKey = 'dashboard-builder-persistence-test';
    window.localStorage.removeItem(storageKey);
    const repository = createLocalStorageDashboardRepository(window.localStorage, storageKey);
    const editingState = enterDashboardEditMode(createDashboardBuilderState(initialDashboard));
    const changedState = deleteDraftWidget(editingState, 'revenue-trend');
    const savedState = saveDashboardDraft(changedState);

    await repository.save(savedState.saved);
    const reloadedRepository = createLocalStorageDashboardRepository(window.localStorage, storageKey);

    expect(reloadedRepository.load()).toEqual(savedState.saved);
    window.localStorage.removeItem(storageKey);
  });

  it('restores the saved data source when a draft data source change is cancelled', () => {
    const editingState = enterDashboardEditMode(createDashboardBuilderState(initialDashboard));
    const kpiWidget = editingState.draft?.widgets.find((widget) => widget.type === 'kpi');
    if (kpiWidget?.type !== 'kpi') {
      throw new Error('Expected a KPI widget');
    }

    const changedState = replaceDraftWidget(editingState, {
      ...kpiWidget,
      dataSource: createDataSource('active-users'),
    });
    const cancelledState = cancelDashboardDraft(changedState);

    expect(cancelledState.saved.widgets[0]?.dataSource.sourceId).toBe('sales-summary');
  });

  it('persists and promotes a draft data source only after save succeeds', async () => {
    const repository = createMemoryDashboardRepository(initialDashboard);
    const editingState = enterDashboardEditMode(createDashboardBuilderState(initialDashboard));
    const kpiWidget = editingState.draft?.widgets.find((widget) => widget.type === 'kpi');
    if (kpiWidget?.type !== 'kpi') {
      throw new Error('Expected a KPI widget');
    }
    const changedState = replaceDraftWidget(editingState, {
      ...kpiWidget,
      dataSource: createDataSource('active-users'),
    });

    const result = await persistDashboardDraft(changedState, repository);

    expect(result.error).toBeNull();
    expect(result.state.saved.widgets[0]?.dataSource.sourceId).toBe('active-users');
    expect(repository.load()?.widgets[0]?.dataSource.sourceId).toBe('active-users');
  });

  it('keeps saved state and the edited draft when persistence fails', async () => {
    const editingState = enterDashboardEditMode(createDashboardBuilderState(initialDashboard));
    const changedState = deleteDraftWidget(editingState, 'recent-events');
    const repository = createFailingDashboardRepository(initialDashboard, new Error('Simulated save failure'));

    const result = await persistDashboardDraft(changedState, repository);

    expect(result.error).toBe('Simulated save failure');
    expect(result.state).toBe(changedState);
    expect(result.state.isEditing).toBe(true);
    expect(result.state.saved).toEqual(initialDashboard);
    expect(result.state.draft?.widgets.some((widget) => widget.id === 'recent-events')).toBe(false);
  });
});
