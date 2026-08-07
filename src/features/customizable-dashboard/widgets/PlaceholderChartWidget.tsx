import type { PlaceholderChartWidget as PlaceholderChartWidgetModel } from '../model/dashboardWidget';

type PlaceholderChartWidgetProps = {
  widget: PlaceholderChartWidgetModel;
};

export function PlaceholderChartWidget({ widget }: PlaceholderChartWidgetProps) {
  return (
    <div className="flex h-full flex-col">
      <div>
        <p className="m-0 text-sm font-bold text-ink">{widget.config.title}</p>
        <p className="mb-0 mt-1 text-xs text-muted">{widget.config.description}</p>
      </div>
      <div className="mt-4 flex min-h-0 flex-1 items-end gap-2 rounded-md bg-slate-50 px-4 py-3" aria-hidden="true">
        {[42, 68, 51, 82, 61, 74].map((height, index) => (
          <div className="flex-1 rounded-t bg-blue-200" key={index} style={{ height: `${String(height)}%` }} />
        ))}
      </div>
    </div>
  );
}
