import { Input } from '@ui/Input';
import { Select } from '@ui/Select';
import { createDataSource, type DashboardDataKind, type DashboardDataSourceId } from '../data/dashboardDataSource';
import { getDataSourceOptions } from '../data/dashboardDataSourceRegistry';
import type { ChartWidget, DashboardWidget, KpiWidget, TableWidget } from '../model/dashboardWidget';
import { removeEmptyFilters } from '../model/dashboardFilters';

type DataSourceSelectProps = {
  kind: DashboardDataKind;
  sourceId: DashboardDataSourceId;
  onChange: (sourceId: DashboardDataSourceId) => void;
};

function DataSourceSelect({ kind, onChange, sourceId }: DataSourceSelectProps) {
  return (
    <Select
      label="Data source"
      options={getDataSourceOptions(kind).map((option) => ({ label: option.label, value: option.id }))}
      value={sourceId}
      onChange={(event) => onChange(event.target.value as DashboardDataSourceId)}
    />
  );
}

type ConfigEditorProps<TWidget> = {
  widget: TWidget;
  onChange: (widget: TWidget) => void;
};

function CommonWidgetSettings({ onChange, widget }: ConfigEditorProps<DashboardWidget>) {
  const refreshValue = widget.dataSource.refreshPolicy?.mode === 'interval'
    ? String(widget.dataSource.refreshPolicy.intervalMs)
    : 'manual';
  return (
    <>
      <Input
        label="Local product filter"
        value={widget.localFilters.product ?? ''}
        onChange={(event) => onChange({ ...widget, localFilters: removeEmptyFilters({ ...widget.localFilters, product: event.target.value }) })}
      />
      <Select
        label="Refresh policy"
        options={[
          { label: 'Manual', value: 'manual' },
          { label: 'Every 5 seconds', value: '5000' },
          { label: 'Every 30 seconds', value: '30000' },
          { label: 'Every minute', value: '60000' },
        ]}
        value={refreshValue}
        onChange={(event) => {
          const value = event.target.value;
          onChange({
            ...widget,
            dataSource: {
              ...widget.dataSource,
              refreshPolicy: value === 'manual'
                ? { mode: 'manual', staleTimeMs: 60_000 }
                : { mode: 'interval', intervalMs: Number(value) as 5_000 | 30_000 | 60_000 },
            },
          });
        }}
      />
      <label className="dashboard-checkbox"><input type="checkbox" checked={widget.filterConfig.useGlobalFilters} onChange={(event) => onChange({ ...widget, filterConfig: { ...widget.filterConfig, useGlobalFilters: event.target.checked } })} />Use global filters</label>
      <label className="dashboard-checkbox"><input type="checkbox" checked={widget.filterConfig.acceptCrossWidgetFilters} onChange={(event) => onChange({ ...widget, filterConfig: { ...widget.filterConfig, acceptCrossWidgetFilters: event.target.checked } })} />Accept cross-widget filters</label>
    </>
  );
}

export function KpiConfigEditor({ onChange, widget }: ConfigEditorProps<KpiWidget>) {
  return (
    <>
      <Input
        label="KPI title"
        value={widget.config.title}
        onChange={(event) => onChange({ ...widget, config: { ...widget.config, title: event.target.value } })}
      />
      <DataSourceSelect
        kind="kpi"
        sourceId={widget.dataSource.sourceId}
        onChange={(sourceId) => onChange({ ...widget, dataSource: createDataSource(sourceId) })}
      />
      <CommonWidgetSettings widget={widget} onChange={(changed) => onChange(changed as KpiWidget)} />
    </>
  );
}

export function ChartConfigEditor({ onChange, widget }: ConfigEditorProps<ChartWidget>) {
  return (
    <>
      <Input
        label="Chart title"
        value={widget.config.title}
        onChange={(event) => onChange({ ...widget, config: { ...widget.config, title: event.target.value } })}
      />
      <DataSourceSelect
        kind="series"
        sourceId={widget.dataSource.sourceId}
        onChange={(sourceId) => onChange({ ...widget, dataSource: createDataSource(sourceId) })}
      />
      <Select
        label="Chart type"
        options={[{ label: 'Line', value: 'line' }, { label: 'Bar', value: 'bar' }]}
        value={widget.config.chartType}
        onChange={(event) =>
          onChange({ ...widget, config: { ...widget.config, chartType: event.target.value as 'line' | 'bar' } })
        }
      />
      <CommonWidgetSettings widget={widget} onChange={(changed) => onChange(changed as ChartWidget)} />
    </>
  );
}

export function TableConfigEditor({ onChange, widget }: ConfigEditorProps<TableWidget>) {
  return (
    <>
      <Input
        label="Table title"
        value={widget.config.title}
        onChange={(event) => onChange({ ...widget, config: { ...widget.config, title: event.target.value } })}
      />
      <DataSourceSelect
        kind="table"
        sourceId={widget.dataSource.sourceId}
        onChange={(sourceId) => onChange({ ...widget, dataSource: createDataSource(sourceId) })}
      />
      <CommonWidgetSettings widget={widget} onChange={(changed) => onChange(changed as TableWidget)} />
    </>
  );
}
