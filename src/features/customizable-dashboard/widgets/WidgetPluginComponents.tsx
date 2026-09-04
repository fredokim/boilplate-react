import type { DashboardWidget } from '../model/dashboardWidget';
import { KpiWidget } from './KpiWidget';
import { ChartConfigEditor, KpiConfigEditor, TableConfigEditor } from './WidgetConfigEditors';
import { LightweightWidget } from './LightweightWidget';
import { RuntimeErrorWidget } from './RuntimeErrorWidget';

export function KpiWidgetPlugin({ widget }: { widget: DashboardWidget }) {
  return widget.type === 'kpi' ? <KpiWidget widget={widget} /> : null;
}

export function KpiEditorPlugin({ onChange, widget }: { widget: DashboardWidget; onChange: (widget: DashboardWidget) => void }) {
  return widget.type === 'kpi' ? <KpiConfigEditor onChange={onChange} widget={widget} /> : null;
}

export function ChartEditorPlugin({ onChange, widget }: { widget: DashboardWidget; onChange: (widget: DashboardWidget) => void }) {
  return widget.type === 'chart' ? <ChartConfigEditor onChange={onChange} widget={widget} /> : null;
}

export function TableEditorPlugin({ onChange, widget }: { widget: DashboardWidget; onChange: (widget: DashboardWidget) => void }) {
  return widget.type === 'table' ? <TableConfigEditor onChange={onChange} widget={widget} /> : null;
}

export function LightweightWidgetPlugin({ widget }: { widget: DashboardWidget }) {
  return widget.type === 'lightweight' ? <LightweightWidget widget={widget} /> : null;
}

export function RuntimeErrorWidgetPlugin({ widget }: { widget: DashboardWidget }) {
  return widget.type === 'runtime-error' ? <RuntimeErrorWidget widget={widget} /> : null;
}
