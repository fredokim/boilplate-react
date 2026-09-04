import type { Dashboard, DashboardLayoutItem, DashboardWidget } from './dashboardWidget';
import type { DashboardFilterValues } from './dashboardFilters';

export type DashboardBuilderState = {
  saved: Dashboard;
  draft: Dashboard | null;
  isEditing: boolean;
  past: Dashboard[];
  future: Dashboard[];
};

export function cloneDashboard(dashboard: Dashboard): Dashboard {
  return structuredClone(dashboard);
}

export function createDashboardBuilderState(saved: Dashboard): DashboardBuilderState {
  return { saved: cloneDashboard(saved), draft: null, isEditing: false, past: [], future: [] };
}

export function enterDashboardEditMode(state: DashboardBuilderState): DashboardBuilderState {
  if (state.isEditing) {
    return state;
  }

  return { ...state, draft: cloneDashboard(state.saved), isEditing: true, past: [], future: [] };
}

export function cancelDashboardDraft(state: DashboardBuilderState): DashboardBuilderState {
  return state.isEditing ? { ...state, draft: null, isEditing: false, past: [], future: [] } : state;
}

export function saveDashboardDraft(state: DashboardBuilderState): DashboardBuilderState {
  if (!state.draft) {
    return state;
  }

  return { saved: cloneDashboard(state.draft), draft: null, isEditing: false, past: [], future: [] };
}

function commitDraft(state: DashboardBuilderState, draft: Dashboard): DashboardBuilderState {
  if (!state.draft || JSON.stringify(state.draft) === JSON.stringify(draft)) {
    return state;
  }
  return { ...state, draft, past: [...state.past, cloneDashboard(state.draft)], future: [] };
}

export function updateDraftLayout(
  state: DashboardBuilderState,
  layout: readonly DashboardLayoutItem[],
): DashboardBuilderState {
  if (!state.draft) {
    return state;
  }

  const layoutById = new Map(layout.map((item) => [item.id, item]));
  return commitDraft(state, {
      ...state.draft,
      widgets: state.draft.widgets.map((widget) => {
        const item = layoutById.get(widget.id);
        return item
          ? {
              ...widget,
              position: { ...item.position },
              width: item.width,
              height: item.height,
            }
          : widget;
      }),
    });
}

export function addDraftWidget(state: DashboardBuilderState, widget: DashboardWidget): DashboardBuilderState {
  if (!state.draft) {
    return state;
  }

  return commitDraft(state, { ...state.draft, widgets: [...state.draft.widgets, structuredClone(widget)] });
}

export function deleteDraftWidget(state: DashboardBuilderState, widgetId: string): DashboardBuilderState {
  if (!state.draft) {
    return state;
  }

  return commitDraft(state, { ...state.draft, widgets: state.draft.widgets.filter((widget) => widget.id !== widgetId) });
}

export function replaceDraftWidget(state: DashboardBuilderState, updatedWidget: DashboardWidget): DashboardBuilderState {
  if (!state.draft) {
    return state;
  }

  return commitDraft(state, {
      ...state.draft,
      widgets: state.draft.widgets.map((widget) =>
        widget.id === updatedWidget.id ? structuredClone(updatedWidget) : widget,
      ),
    });
}

export function updateGlobalFilters(
  state: DashboardBuilderState,
  filters: DashboardFilterValues,
): DashboardBuilderState {
  if (state.draft) {
    return commitDraft(state, { ...state.draft, globalFilters: structuredClone(filters) });
  }
  return { ...state, saved: { ...state.saved, globalFilters: structuredClone(filters) } };
}

export function updateLocalFilters(
  state: DashboardBuilderState,
  widgetId: string,
  filters: DashboardFilterValues,
): DashboardBuilderState {
  const dashboard = state.draft ?? state.saved;
  const nextDashboard = {
    ...dashboard,
    widgets: dashboard.widgets.map((widget) => widget.id === widgetId ? { ...widget, localFilters: structuredClone(filters) } : widget),
  };
  return state.draft ? commitDraft(state, nextDashboard) : { ...state, saved: nextDashboard };
}

export function applyCrossWidgetFilters(
  state: DashboardBuilderState,
  sourceWidgetId: string,
  filters: DashboardFilterValues,
): DashboardBuilderState {
  const dashboard = state.draft ?? state.saved;
  const nextDashboard = {
    ...dashboard,
    widgets: dashboard.widgets.map((widget) =>
      widget.id !== sourceWidgetId && widget.filterConfig.acceptCrossWidgetFilters
        ? { ...widget, crossWidgetFilters: structuredClone(filters) }
        : widget,
    ),
  };
  return state.draft ? { ...state, draft: nextDashboard } : { ...state, saved: nextDashboard };
}

export function undoDashboardDraft(state: DashboardBuilderState): DashboardBuilderState {
  if (!state.draft || state.past.length === 0) return state;
  const previous = state.past.at(-1);
  if (!previous) return state;
  return {
    ...state,
    draft: cloneDashboard(previous),
    past: state.past.slice(0, -1),
    future: [cloneDashboard(state.draft), ...state.future],
  };
}

export function redoDashboardDraft(state: DashboardBuilderState): DashboardBuilderState {
  if (!state.draft || state.future.length === 0) return state;
  const [next, ...future] = state.future;
  if (!next) return state;
  return {
    ...state,
    draft: cloneDashboard(next),
    past: [...state.past, cloneDashboard(state.draft)],
    future,
  };
}

export function importDashboardDraft(state: DashboardBuilderState, dashboard: Dashboard): DashboardBuilderState {
  const current = state.draft ?? state.saved;
  return {
    ...state,
    draft: cloneDashboard(dashboard),
    isEditing: true,
    past: [cloneDashboard(current)],
    future: [],
  };
}

export function getVisibleDashboard(state: DashboardBuilderState): Dashboard {
  return state.draft ?? state.saved;
}
