import type { DashboardWidget } from '../model/dashboardWidget';
import { TableWidget } from './TableWidget';

export default function TableWidgetPlugin({ widget }: { widget: DashboardWidget }) {
  return widget.type === 'table' ? <TableWidget widget={widget} /> : null;
}
