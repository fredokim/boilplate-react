import { Button } from '@ui/Button';
import ReactGridLayout, { useContainerWidth, type Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import type { Dashboard, DashboardWidget, WidgetType } from '../model/dashboardWidget';
import type { DashboardEventBus } from '../events/dashboardEventBus';
import { removeEmptyFilters } from '../model/dashboardFilters';
import { renderWidgetConfigEditor, type WidgetRegistry } from '../widgets/widgetRegistry';
import { WidgetRenderer } from '../widgets/WidgetRenderer';
import { DashboardPerformanceDebugPanel } from '../performance/DashboardPerformanceDebugPanel';
import { recordDashboardRender } from '../performance/dashboardPerformanceMetrics';
import './customizableDashboard.scss';

type CustomizableDashboardViewProps = {
  dashboard: Dashboard;
  registry: WidgetRegistry;
  permissions: { canEdit: boolean; canExport: boolean; canImport: boolean };
  showPerformanceDebug?: boolean;
  eventBus: DashboardEventBus;
  canUndo: boolean;
  canRedo: boolean;
  importError: string | null;
  isEditing: boolean;
  isSaving: boolean;
  onAddWidget: (type: WidgetType) => void;
  onCancel: () => void;
  onDeleteWidget: (widgetId: string) => void;
  onEdit: () => void;
  onLayoutChange: (layout: { id: string; position: { x: number; y: number }; width: number; height: number }[]) => void;
  onSave: () => void;
  onWidgetChange: (widget: DashboardWidget) => void;
  onImport: (serializedDashboard: string) => void;
  onExport: () => string | undefined;
  onUndo: () => void;
  onRedo: () => void;
  selectedWidgetId: string | null;
  saveError: string | null;
};

export function CustomizableDashboardView({
  dashboard,
  registry,
  permissions,
  showPerformanceDebug = false,
  eventBus,
  canUndo,
  canRedo,
  importError,
  isEditing,
  isSaving,
  onAddWidget,
  onCancel,
  onDeleteWidget,
  onEdit,
  onLayoutChange,
  onSave,
  onWidgetChange,
  onImport,
  onExport,
  onUndo,
  onRedo,
  selectedWidgetId,
  saveError,
}: CustomizableDashboardViewProps) {
  recordDashboardRender();
  const { containerRef, mounted, width } = useContainerWidth();
  const widgetPickerItems = registry.getPickerItems();
  const layout: Layout = dashboard.widgets.map((widget) => ({
    i: widget.id,
    x: widget.position.x,
    y: widget.position.y,
    w: widget.width,
    h: widget.height,
    minW: 2,
    minH: 2,
    isResizable: registry.get(widget.type).capabilities.resizable,
  }));

  const handleLayoutChange = (nextLayout: Layout) => {
    onLayoutChange(
      nextLayout.map((item) => ({
        id: item.i,
        position: { x: item.x, y: item.y },
        width: item.w,
        height: item.h,
      })),
    );
  };

  const updateGlobalFilter = (key: 'dateFrom' | 'dateTo' | 'region' | 'product', value: string) => {
    eventBus.publish({
      type: 'FilterChanged',
      sourceWidgetId: null,
      scope: 'global',
      filters: removeEmptyFilters({ ...dashboard.globalFilters, [key]: value }),
    });
  };

  const downloadDashboard = () => {
    const serializedDashboard = onExport();
    if (!serializedDashboard) return;
    const url = URL.createObjectURL(new Blob([serializedDashboard], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'dashboard.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-grid">
      <div className="page-heading">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="m-0 text-2xl font-black text-ink">Customizable Dashboard</h1>
            {isEditing ? <span className="dashboard-edit-badge">Editing draft</span> : null}
          </div>
          <p className="mt-2 text-sm text-muted">
            {isEditing ? 'Changes remain in a draft until you save.' : 'View mode prevents accidental layout changes.'}
          </p>
        </div>
        <div className="flex gap-2">
          {permissions.canExport ? <Button variant="secondary" onClick={downloadDashboard}>Export JSON</Button> : null}
          {isEditing ? (
            <>
              <Button disabled={!canUndo || isSaving} variant="secondary" onClick={onUndo}>Undo</Button>
              <Button disabled={!canRedo || isSaving} variant="secondary" onClick={onRedo}>Redo</Button>
              {permissions.canImport ? <label className="dashboard-import-button">
                Import JSON
                <input
                  accept="application/json"
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void file.text().then(onImport);
                    event.target.value = '';
                  }}
                />
              </label> : null}
              <Button disabled={isSaving} variant="secondary" onClick={onCancel}>Cancel</Button>
              <Button isLoading={isSaving} onClick={onSave}>Save</Button>
            </>
          ) : permissions.canEdit ? (
            <Button onClick={onEdit}>Edit dashboard</Button>
          ) : null}
        </div>
      </div>

      {saveError || importError ? <div className="dashboard-save-error" role="alert">{saveError ?? importError}</div> : null}

      <section className="dashboard-global-filters" aria-label="Global filters">
        <strong className="text-sm text-ink">Global filters</strong>
        <label>From<input type="date" value={dashboard.globalFilters.dateFrom ?? ''} onChange={(event) => updateGlobalFilter('dateFrom', event.target.value)} /></label>
        <label>To<input type="date" value={dashboard.globalFilters.dateTo ?? ''} onChange={(event) => updateGlobalFilter('dateTo', event.target.value)} /></label>
        <label>Region<select value={dashboard.globalFilters.region ?? ''} onChange={(event) => updateGlobalFilter('region', event.target.value)}><option value="">All</option><option value="americas">Americas</option><option value="emea">EMEA</option><option value="apac">APAC</option></select></label>
        <label>Product<input placeholder="All products" value={dashboard.globalFilters.product ?? ''} onChange={(event) => updateGlobalFilter('product', event.target.value)} /></label>
        <Button size="sm" variant="secondary" onClick={() => eventBus.publish({ type: 'RefreshRequested' })}>Refresh all</Button>
      </section>

      {isEditing ? (
        <section className="dashboard-toolbar" aria-label="Widget picker">
          <strong className="text-sm text-ink">Add widget</strong>
          <div className="flex flex-wrap gap-2">
            {widgetPickerItems.map((item) => (
              <Button key={item.type} size="sm" variant="secondary" onClick={() => onAddWidget(item.type)}>
                + {item.label}
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="dashboard-grid-container" ref={containerRef}>
        {mounted ? (
          <ReactGridLayout
            dragConfig={{ enabled: permissions.canEdit && isEditing && !isSaving, handle: '.dashboard-widget__handle', cancel: '.dashboard-widget__action' }}
            gridConfig={{ cols: 12, margin: [16, 16], rowHeight: 52 }}
            layout={layout}
            onLayoutChange={handleLayoutChange}
            resizeConfig={{ enabled: permissions.canEdit && isEditing && !isSaving, handles: ['se'] }}
            width={width}
          >
            {dashboard.widgets.map((widget) => (
              <article
                className={['dashboard-widget', selectedWidgetId === widget.id ? 'dashboard-widget--selected' : ''].join(' ')}
                key={widget.id}
                onClick={() => eventBus.publish({ type: 'WidgetSelected', widgetId: widget.id })}
              >
                <div className={['dashboard-widget__header', isEditing ? 'dashboard-widget__handle' : ''].join(' ')}>
                  <div className="flex items-center gap-2">
                    <span>{registry.get(widget.type).displayName}</span>
                    {widget.localFilters.product ? <span className="dashboard-filter-badge">Local: {widget.localFilters.product}</span> : null}
                    {widget.crossWidgetFilters.product ? <span className="dashboard-filter-badge">Cross: {widget.crossWidgetFilters.product}</span> : null}
                    {widget.dataSource.refreshPolicy?.mode === 'interval' ? <span className="dashboard-filter-badge">Every {(widget.dataSource.refreshPolicy.intervalMs ?? 0) / 1000}s</span> : null}
                  </div>
                  {isEditing ? (
                    <button
                      aria-label={`Delete ${widget.config.title}`}
                      className="dashboard-widget__action"
                      type="button"
                      onClick={() => onDeleteWidget(widget.id)}
                    >
                      Delete
                    </button>
                  ) : registry.get(widget.type).capabilities.refreshable ? (
                    <button
                      aria-label={`Refresh ${widget.config.title}`}
                      className="dashboard-widget__action"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        eventBus.publish({ type: 'RefreshRequested', widgetId: widget.id });
                      }}
                    >Refresh</button>
                  ) : null}
                </div>
                <div className="dashboard-widget__content"><WidgetRenderer registry={registry} widget={widget} /></div>
              </article>
            ))}
          </ReactGridLayout>
        ) : null}
      </div>

      {isEditing && dashboard.widgets.length > 0 ? (
        <section className="dashboard-settings" aria-label="Widget settings">
          <div>
            <h2 className="m-0 text-lg font-bold text-ink">Widget settings</h2>
            <p className="mb-0 mt-1 text-sm text-muted">Each widget definition supplies its own editor.</p>
          </div>
          <div className="dashboard-settings__grid">
            {dashboard.widgets.map((widget) => (
              <div className="dashboard-settings__item" key={widget.id}>
                <strong className="text-sm text-ink">{widget.config.title}</strong>
                {renderWidgetConfigEditor(widget, onWidgetChange, registry)}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {showPerformanceDebug ? (
        <DashboardPerformanceDebugPanel selectedWidgetId={selectedWidgetId} widgetCount={dashboard.widgets.length} />
      ) : null}
    </div>
  );
}
