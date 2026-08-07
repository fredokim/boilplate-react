import { useCallback, useState } from 'react';
import type { Layout } from 'react-grid-layout';
import type { DashboardWidget } from '../model/dashboardWidget';
import { CustomizableDashboardView } from '../views/CustomizableDashboardView';

const initialWidgets: DashboardWidget[] = [
  {
    id: 'monthly-revenue',
    type: 'kpi',
    position: { x: 0, y: 0 },
    width: 4,
    height: 3,
    config: { title: 'Monthly revenue', value: '$48,240', change: '+12.4% from last month' },
  },
  {
    id: 'revenue-trend',
    type: 'placeholder-chart',
    position: { x: 4, y: 0 },
    width: 8,
    height: 5,
    config: { title: 'Revenue trend', description: 'Chart integration will be added in a later step.' },
  },
];

export default function CustomizableDashboardContainer() {
  const [widgets, setWidgets] = useState(initialWidgets);

  const handleLayoutChange = useCallback((layout: Layout) => {
    const layoutById = new Map(layout.map((item) => [item.i, item]));

    setWidgets((currentWidgets) =>
      currentWidgets.map((widget) => {
        const item = layoutById.get(widget.id);
        return item
          ? {
              ...widget,
              position: { x: item.x, y: item.y },
              width: item.w,
              height: item.h,
            }
          : widget;
      }),
    );
  }, []);

  return <CustomizableDashboardView onLayoutChange={handleLayoutChange} widgets={widgets} />;
}

