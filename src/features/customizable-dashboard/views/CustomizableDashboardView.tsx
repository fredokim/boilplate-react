import ReactGridLayout, { useContainerWidth, type Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import type { DashboardWidget } from '../model/dashboardWidget';
import { renderWidget } from '../widgets/widgetRegistry';
import './customizableDashboard.scss';

type CustomizableDashboardViewProps = {
  widgets: DashboardWidget[];
  onLayoutChange: (layout: Layout) => void;
};

export function CustomizableDashboardView({ onLayoutChange, widgets }: CustomizableDashboardViewProps) {
  const { containerRef, mounted, width } = useContainerWidth();
  const layout: Layout = widgets.map((widget) => ({
    i: widget.id,
    x: widget.position.x,
    y: widget.position.y,
    w: widget.width,
    h: widget.height,
    minW: 2,
    minH: 2,
  }));

  return (
    <div className="page-grid">
      <div className="page-heading">
        <div>
          <h1 className="m-0 text-2xl font-black text-ink">Customizable Dashboard</h1>
          <p className="mt-2 text-sm text-muted">Drag a widget by its header and resize it from the bottom-right corner.</p>
        </div>
      </div>
      <div className="dashboard-grid-container" ref={containerRef}>
        {mounted ? (
          <ReactGridLayout
            dragConfig={{ enabled: true, handle: '.dashboard-widget__handle' }}
            gridConfig={{ cols: 12, margin: [16, 16], rowHeight: 52 }}
            layout={layout}
            onLayoutChange={onLayoutChange}
            resizeConfig={{ enabled: true, handles: ['se'] }}
            width={width}
          >
            {widgets.map((widget) => (
              <article className="dashboard-widget" key={widget.id}>
                <div className="dashboard-widget__handle">
                  <span>{widget.type === 'kpi' ? 'KPI' : 'Chart'}</span>
                  <span aria-hidden="true">⋮⋮</span>
                </div>
                <div className="dashboard-widget__content">{renderWidget(widget)}</div>
              </article>
            ))}
          </ReactGridLayout>
        ) : null}
      </div>
    </div>
  );
}

