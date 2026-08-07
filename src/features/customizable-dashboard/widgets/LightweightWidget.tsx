import { memo } from 'react';
import type { LightweightWidget as LightweightWidgetModel } from '../model/dashboardWidget';

export const LightweightWidget = memo(function LightweightWidget({ widget }: { widget: LightweightWidgetModel }) {
  return <div><p className="m-0 text-sm font-bold text-ink">{widget.config.title}</p><p className="mt-2 text-2xl font-black text-ink">{widget.config.value}</p></div>;
});
