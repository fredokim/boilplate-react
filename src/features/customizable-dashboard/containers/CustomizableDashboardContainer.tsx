import { useMemo } from 'react';
import { createDashboardEventBus } from '../events/dashboardEventBus';
import { DashboardRuntimeProvider } from '../events/DashboardRuntimeProvider';
import { useDashboardBuilder } from '../hooks/useDashboardBuilder';
import { initialDashboard as defaultDashboard } from '../model/initialDashboard';
import type { Dashboard } from '../model/dashboardWidget';
import {
  createLocalStorageDashboardRepository,
  type DashboardRepository,
} from '../persistence/dashboardRepository';
import { CustomizableDashboardView } from '../views/CustomizableDashboardView';
import { createDashboardActionGate, type DashboardRole } from '../permissions/dashboardPermissions';
import { exportDashboard } from '../model/dashboardSerialization';
import { defaultWidgetRegistry, type WidgetRegistry } from '../widgets/widgetRegistry';

type CustomizableDashboardContainerProps = {
  initialDashboard?: Dashboard;
  initiallyEditing?: boolean;
  repository?: DashboardRepository;
  role?: DashboardRole;
  registry?: WidgetRegistry;
  showPerformanceDebug?: boolean;
};

export default function CustomizableDashboardContainer({
  initialDashboard = defaultDashboard,
  initiallyEditing = false,
  repository: providedRepository,
  role = 'owner',
  registry = defaultWidgetRegistry,
  showPerformanceDebug = false,
}: CustomizableDashboardContainerProps) {
  const repository = useMemo(
    () => providedRepository ?? createLocalStorageDashboardRepository(window.localStorage),
    [providedRepository],
  );
  const eventBus = useMemo(() => createDashboardEventBus(), []);
  const actionGate = useMemo(() => createDashboardActionGate(role), [role]);
  const builder = useDashboardBuilder({ initialDashboard, initiallyEditing, repository, eventBus, actionGate, registry });

  return (
    <DashboardRuntimeProvider dashboard={builder.dashboard} eventBus={eventBus}>
      <CustomizableDashboardView
      dashboard={builder.dashboard}
      registry={registry}
      showPerformanceDebug={showPerformanceDebug}
      permissions={{
        canEdit: actionGate.can('edit'),
        canExport: actionGate.can('export'),
        canImport: actionGate.can('import'),
      }}
      eventBus={eventBus}
      canRedo={builder.canRedo}
      canUndo={builder.canUndo}
      importError={builder.importError}
      isEditing={builder.isEditing}
      isSaving={builder.isSaving}
      onAddWidget={builder.addWidget}
      onCancel={builder.cancel}
      onDeleteWidget={builder.deleteWidget}
      onEdit={builder.enterEditMode}
      onLayoutChange={builder.updateLayout}
      onSave={builder.save}
      onWidgetChange={builder.updateWidget}
      onImport={builder.importJson}
      onExport={() => actionGate.execute('export', () => exportDashboard(builder.dashboard))}
      onRedo={builder.redo}
      onUndo={builder.undo}
      selectedWidgetId={builder.selectedWidgetId}
      saveError={builder.saveError}
      />
    </DashboardRuntimeProvider>
  );
}
