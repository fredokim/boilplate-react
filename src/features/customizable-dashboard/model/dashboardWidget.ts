export type WidgetPosition = {
  x: number;
  y: number;
};

type WidgetBase<TType extends string, TConfig> = {
  id: string;
  type: TType;
  position: WidgetPosition;
  width: number;
  height: number;
  config: TConfig;
};

export type KpiWidget = WidgetBase<
  'kpi',
  {
    title: string;
    value: string;
    change?: string;
  }
>;

export type PlaceholderChartWidget = WidgetBase<
  'placeholder-chart',
  {
    title: string;
    description: string;
  }
>;

export type DashboardWidget = KpiWidget | PlaceholderChartWidget;
export type WidgetType = DashboardWidget['type'];

