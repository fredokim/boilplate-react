import type { ReactNode } from 'react';
import type { DashboardWidget, KpiWidget as KpiWidgetModel, PlaceholderChartWidget as PlaceholderChartWidgetModel, WidgetType } from '../model/dashboardWidget';
import { KpiWidget } from './KpiWidget';
import { PlaceholderChartWidget } from './PlaceholderChartWidget';

type WidgetRenderer<TWidget extends DashboardWidget> = (widget: TWidget) => ReactNode;

type WidgetRegistry = {
  kpi: WidgetRenderer<KpiWidgetModel>;
  'placeholder-chart': WidgetRenderer<PlaceholderChartWidgetModel>;
};

const widgetRegistry = {
  kpi: (widget) => <KpiWidget widget={widget} />,
  'placeholder-chart': (widget) => <PlaceholderChartWidget widget={widget} />,
} satisfies WidgetRegistry;

export function renderWidget(widget: DashboardWidget): ReactNode {
  switch (widget.type) {
    case 'kpi':
      return widgetRegistry.kpi(widget);
    case 'placeholder-chart':
      return widgetRegistry['placeholder-chart'](widget);
  }
}

export const registeredWidgetTypes = Object.keys(widgetRegistry) as WidgetType[];

