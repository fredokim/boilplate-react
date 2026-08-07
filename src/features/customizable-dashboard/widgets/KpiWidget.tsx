import type { KpiWidget as KpiWidgetModel } from '../model/dashboardWidget';

type KpiWidgetProps = {
  widget: KpiWidgetModel;
};

export function KpiWidget({ widget }: KpiWidgetProps) {
  return (
    <div className="flex h-full flex-col justify-between">
      <p className="m-0 text-sm font-semibold text-muted">{widget.config.title}</p>
      <div>
        <p className="m-0 text-3xl font-black text-ink">{widget.config.value}</p>
        {widget.config.change ? (
          <p className="mb-0 mt-2 text-sm font-semibold text-emerald-600">{widget.config.change}</p>
        ) : null}
      </div>
    </div>
  );
}

