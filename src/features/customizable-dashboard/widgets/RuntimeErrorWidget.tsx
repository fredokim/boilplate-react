import type { ErrorDemoWidget } from '../model/dashboardWidget';

export function RuntimeErrorWidget({ widget }: { widget: ErrorDemoWidget }) {
  throw new Error(`${widget.config.title} failed during render.`);
  return null;
}
