import { lazy, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react';
import { createDataSource, type WidgetDataSource } from '../data/dashboardDataSource';
import type { DashboardWidget, WidgetPosition, WidgetType } from '../model/dashboardWidget';
import {
  ChartEditorPlugin,
  KpiEditorPlugin,
  KpiWidgetPlugin,
  LightweightWidgetPlugin,
  RuntimeErrorWidgetPlugin,
  TableEditorPlugin,
} from './WidgetPluginComponents';

export type WidgetCapabilities = {
  resizable: boolean;
  refreshable: boolean;
  filterable: boolean;
  exportable: boolean;
};

type WidgetComponent = ComponentType<{ widget: DashboardWidget }>;
type WidgetConfigEditor = ComponentType<{ widget: DashboardWidget; onChange: (widget: DashboardWidget) => void }>;
type WidgetModule = { default: WidgetComponent };

export type WidgetDefinition = {
  type: WidgetType;
  displayName: string;
  component: WidgetComponent | LazyExoticComponent<WidgetComponent>;
  defaultSize: { width: number; height: number };
  defaultConfig: DashboardWidget['config'];
  configEditor?: WidgetConfigEditor;
  dataSource?: { createDefault: () => WidgetDataSource };
  capabilities: WidgetCapabilities;
  lazyLoader?: () => Promise<WidgetModule>;
  availableInPicker?: boolean;
};

export class WidgetRegistry {
  private readonly definitions = new Map<WidgetType, WidgetDefinition>();

  register(definition: WidgetDefinition): this {
    this.definitions.set(definition.type, definition);
    return this;
  }

  get(type: WidgetType): WidgetDefinition {
    const definition = this.definitions.get(type);
    if (!definition) throw new Error(`Widget type ${type} is not registered.`);
    return definition;
  }

  getPickerItems() {
    return [...this.definitions.values()]
      .filter((definition) => definition.availableInPicker !== false)
      .map(({ type, displayName, defaultSize }) => ({ type, label: displayName, defaultSize }));
  }
}

const dataCapabilities: WidgetCapabilities = {
  resizable: true,
  refreshable: true,
  filterable: true,
  exportable: true,
};

const chartLoader = () => import('./ChartWidgetPlugin');
const tableLoader = () => import('./TableWidgetPlugin');
const lazyErrorLoader = () => Promise.reject<WidgetModule>(new Error('Lazy widget module failed to load.'));

export function createDefaultWidgetRegistry(): WidgetRegistry {
  return new WidgetRegistry()
    .register({
      type: 'kpi', displayName: 'KPI', component: KpiWidgetPlugin,
      defaultSize: { width: 4, height: 3 }, defaultConfig: { title: 'New KPI' },
      configEditor: KpiEditorPlugin, dataSource: { createDefault: () => createDataSource('sales-summary') },
      capabilities: dataCapabilities,
    })
    .register({
      type: 'chart', displayName: 'Chart', component: lazy(chartLoader), lazyLoader: chartLoader,
      defaultSize: { width: 8, height: 5 }, defaultConfig: { title: 'New chart', chartType: 'line' },
      configEditor: ChartEditorPlugin, dataSource: { createDefault: () => createDataSource('traffic-series') },
      capabilities: dataCapabilities,
    })
    .register({
      type: 'table', displayName: 'Table', component: lazy(tableLoader), lazyLoader: tableLoader,
      defaultSize: { width: 12, height: 5 }, defaultConfig: { title: 'New table' },
      configEditor: TableEditorPlugin, dataSource: { createDefault: () => createDataSource('recent-events') },
      capabilities: dataCapabilities,
    })
    .register({
      type: 'lightweight', displayName: 'Lightweight', component: LightweightWidgetPlugin,
      defaultSize: { width: 3, height: 2 }, defaultConfig: { title: 'Lightweight widget', value: 0 },
      capabilities: { resizable: true, refreshable: false, filterable: false, exportable: true },
      availableInPicker: false,
    })
    .register({
      type: 'runtime-error', displayName: 'Runtime error', component: RuntimeErrorWidgetPlugin,
      defaultSize: { width: 4, height: 3 }, defaultConfig: { title: 'Runtime error widget' },
      capabilities: { resizable: true, refreshable: false, filterable: false, exportable: false },
      availableInPicker: false,
    })
    .register({
      type: 'lazy-error', displayName: 'Lazy error', component: lazy(lazyErrorLoader), lazyLoader: lazyErrorLoader,
      defaultSize: { width: 4, height: 3 }, defaultConfig: { title: 'Lazy error widget' },
      capabilities: { resizable: true, refreshable: false, filterable: false, exportable: false },
      availableInPicker: false,
    });
}

export const defaultWidgetRegistry = createDefaultWidgetRegistry();
export const widgetPickerItems = defaultWidgetRegistry.getPickerItems();

export function createWidget(
  type: WidgetType,
  id: string,
  position: WidgetPosition,
  registry: WidgetRegistry = defaultWidgetRegistry,
): DashboardWidget {
  const definition = registry.get(type);
  const widget = {
    id,
    type,
    position,
    width: definition.defaultSize.width,
    height: definition.defaultSize.height,
    config: structuredClone(definition.defaultConfig),
    dataSource: definition.dataSource?.createDefault() ?? createDataSource('sales-summary'),
    filterConfig: {
      useGlobalFilters: definition.capabilities.filterable,
      acceptCrossWidgetFilters: definition.capabilities.filterable,
    },
    localFilters: {},
    crossWidgetFilters: {},
  };
  return widget as DashboardWidget;
}

export function renderWidgetConfigEditor(
  widget: DashboardWidget,
  onChange: (widget: DashboardWidget) => void,
  registry: WidgetRegistry = defaultWidgetRegistry,
): ReactNode {
  const ConfigEditor = registry.get(widget.type).configEditor;
  return ConfigEditor ? <ConfigEditor onChange={onChange} widget={widget} /> : null;
}
