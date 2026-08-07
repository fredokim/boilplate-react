import type { DashboardWidget } from '../model/dashboardWidget';
import { ChartWidget } from './ChartWidget';

export default function ChartWidgetPlugin({ widget }: { widget: DashboardWidget }) {
  return widget.type === 'chart' ? <ChartWidget widget={widget} /> : null;
}
