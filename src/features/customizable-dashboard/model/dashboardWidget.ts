import type { WidgetDataSource } from '../data/dashboardDataSource';
import type { DashboardFilterValues } from './dashboardFilters';

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
  dataSource: WidgetDataSource;
  filterConfig: {
    useGlobalFilters: boolean;
    acceptCrossWidgetFilters: boolean;
  };
  localFilters: DashboardFilterValues;
  crossWidgetFilters: DashboardFilterValues;
};

export type KpiWidget = WidgetBase<
  'kpi',
  {
    title: string;
  }
>;

export type ChartWidget = WidgetBase<
  'chart',
  {
    title: string;
    chartType: 'line' | 'bar';
  }
>;

export type TableWidget = WidgetBase<
  'table',
  {
    title: string;
  }
>;

export type LightweightWidget = WidgetBase<
  'lightweight',
  { title: string; value: number }
>;

export type ErrorDemoWidget = WidgetBase<
  'lazy-error' | 'runtime-error',
  { title: string }
>;

export type DashboardWidget = KpiWidget | ChartWidget | TableWidget | LightweightWidget | ErrorDemoWidget;
export type WidgetType = DashboardWidget['type'];

export type Dashboard = {
  version: 1;
  metadata: {
    id: string;
    title: string;
    ownerId: string;
    visibility: 'private' | 'shared';
    updatedAt: string;
  };
  globalFilters: DashboardFilterValues;
  widgets: DashboardWidget[];
};

export type DashboardLayoutItem = {
  id: string;
  position: WidgetPosition;
  width: number;
  height: number;
};
