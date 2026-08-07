import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  addDraftWidget,
  cancelDashboardDraft,
  createDashboardBuilderState,
  deleteDraftWidget,
  enterDashboardEditMode,
  getVisibleDashboard,
  replaceDraftWidget,
  updateDraftLayout,
  updateGlobalFilters,
  updateLocalFilters,
  applyCrossWidgetFilters,
  undoDashboardDraft,
  redoDashboardDraft,
  importDashboardDraft,
} from '../model/dashboardBuilder';
import type { DashboardEventBus } from '../events/dashboardEventBus';
import { dashboardDataSourceQueryKey } from '../data/dashboardDataSource';
import { mergeDashboardFilters } from '../model/dashboardFilters';
import { importDashboard } from '../model/dashboardSerialization';
import type { DashboardActionGate } from '../permissions/dashboardPermissions';
import type { Dashboard, DashboardLayoutItem, DashboardWidget, WidgetType } from '../model/dashboardWidget';
import type { DashboardRepository } from '../persistence/dashboardRepository';
import { persistDashboardDraft } from '../persistence/saveDashboardDraft';
import { createWidget, type WidgetRegistry } from '../widgets/widgetRegistry';

type UseDashboardBuilderOptions = {
  initialDashboard: Dashboard;
  initiallyEditing?: boolean;
  repository: DashboardRepository;
  eventBus: DashboardEventBus;
  actionGate: DashboardActionGate;
  registry: WidgetRegistry;
};

function createWidgetId(type: WidgetType): string {
  return `${type}-${crypto.randomUUID()}`;
}

export function useDashboardBuilder({ initialDashboard, initiallyEditing = false, repository, eventBus, actionGate, registry }: UseDashboardBuilderOptions) {
  const queryClient = useQueryClient();
  const [state, setState] = useState(() => {
    const initialState = createDashboardBuilderState(repository.load() ?? initialDashboard);
    return initiallyEditing && actionGate.can('edit') ? enterDashboardEditMode(initialState) : initialState;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);

  useEffect(() => eventBus.subscribe((event) => {
    switch (event.type) {
      case 'WidgetSelected':
        setSelectedWidgetId(event.widgetId);
        break;
      case 'WidgetConfigChanged':
        actionGate.execute('edit', () => setState((currentState) => replaceDraftWidget(currentState, event.widget)));
        break;
      case 'FilterChanged':
        if (!actionGate.can('filter')) break;
        setState((currentState) => {
          if (event.scope === 'global') return updateGlobalFilters(currentState, event.filters);
          if (event.scope === 'local' && event.sourceWidgetId) return updateLocalFilters(currentState, event.sourceWidgetId, event.filters);
          if (event.scope === 'cross-widget' && event.sourceWidgetId) return applyCrossWidgetFilters(currentState, event.sourceWidgetId, event.filters);
          return currentState;
        });
        break;
      case 'RefreshRequested': {
        if (!actionGate.can('refresh')) break;
        const dashboard = state.draft ?? state.saved;
        dashboard.widgets
          .filter((widget) => !event.widgetId || widget.id === event.widgetId)
          .forEach((widget) => {
            const filters = mergeDashboardFilters(
              widget.filterConfig.useGlobalFilters ? dashboard.globalFilters : {},
              widget.crossWidgetFilters,
              widget.localFilters,
            );
            const dataSource = { ...widget.dataSource, parameters: { ...widget.dataSource.parameters, ...filters } };
            void queryClient.invalidateQueries({ queryKey: dashboardDataSourceQueryKey(dataSource), exact: true });
          });
        break;
      }
    }
  }), [actionGate, eventBus, queryClient, state]);

  const enterEditMode = useCallback(() => {
    if (!actionGate.can('edit')) return;
    setSaveError(null);
    setState(enterDashboardEditMode);
  }, [actionGate]);
  const cancel = useCallback(() => {
    setSaveError(null);
    setState(cancelDashboardDraft);
  }, []);
  const save = useCallback(() => {
    if (!actionGate.can('save') || !state.draft || isSaving) {
      return;
    }

    const stateToSave = state;
    setIsSaving(true);
    setSaveError(null);
    void persistDashboardDraft(stateToSave, repository).then((result) => {
      setState((currentState) => (currentState.draft === stateToSave.draft ? result.state : currentState));
      setSaveError(result.error);
      setIsSaving(false);
    });
  }, [actionGate, isSaving, repository, state]);
  const updateLayout = useCallback(
    (layout: readonly DashboardLayoutItem[]) => actionGate.execute('edit', () => setState((currentState) => updateDraftLayout(currentState, layout))),
    [actionGate],
  );
  const addWidget = useCallback((type: WidgetType) => {
    if (!actionGate.can('edit')) return;
    setState((currentState) => {
      if (!currentState.draft) {
        return currentState;
      }

      const nextRow = currentState.draft.widgets.reduce(
        (lowestRow, widget) => Math.max(lowestRow, widget.position.y + widget.height),
        0,
      );
      return addDraftWidget(currentState, createWidget(type, createWidgetId(type), { x: 0, y: nextRow }, registry));
    });
  }, [actionGate, registry]);
  const deleteWidget = useCallback(
    (widgetId: string) => actionGate.execute('edit', () => setState((currentState) => deleteDraftWidget(currentState, widgetId))),
    [actionGate],
  );
  const updateWidget = useCallback(
    (widget: DashboardWidget) => eventBus.publish({ type: 'WidgetConfigChanged', widget }),
    [eventBus],
  );
  const undo = useCallback(() => actionGate.execute('edit', () => setState(undoDashboardDraft)), [actionGate]);
  const redo = useCallback(() => actionGate.execute('edit', () => setState(redoDashboardDraft)), [actionGate]);
  const importJson = useCallback((serializedDashboard: string) => {
    if (!actionGate.can('import')) return;
    try {
      const dashboard = importDashboard(serializedDashboard);
      setState((currentState) => importDashboardDraft(currentState, dashboard));
      setImportError(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Dashboard import failed.');
    }
  }, [actionGate]);

  return {
    dashboard: getVisibleDashboard(state),
    isEditing: state.isEditing,
    isSaving,
    saveError,
    importError,
    selectedWidgetId,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    enterEditMode,
    cancel,
    save,
    updateLayout,
    addWidget,
    deleteWidget,
    updateWidget,
    undo,
    redo,
    importJson,
  };
}
