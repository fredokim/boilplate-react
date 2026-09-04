import type { Dashboard } from './dashboardWidget';
import { createDataSource } from '../data/dashboardDataSource';

export const initialDashboard: Dashboard = {
  version: 1,
  metadata: {
    id: 'operations-dashboard',
    title: 'Operations dashboard',
    ownerId: 'demo-owner',
    visibility: 'private',
    updatedAt: '2026-08-07T00:00:00.000Z',
  },
  globalFilters: {},
  widgets: [
    {
      id: 'monthly-revenue',
      type: 'kpi',
      position: { x: 0, y: 0 },
      width: 4,
      height: 3,
      config: { title: 'Monthly revenue' },
      dataSource: createDataSource('sales-summary'),
      filterConfig: { useGlobalFilters: true, acceptCrossWidgetFilters: true },
      localFilters: {},
      crossWidgetFilters: {},
    },
    {
      id: 'revenue-trend',
      type: 'chart',
      position: { x: 4, y: 0 },
      width: 8,
      height: 5,
      config: { title: 'Traffic trend', chartType: 'line' },
      dataSource: createDataSource('traffic-series'),
      filterConfig: { useGlobalFilters: true, acceptCrossWidgetFilters: true },
      localFilters: {},
      crossWidgetFilters: {},
    },
    {
      id: 'recent-events',
      type: 'table',
      position: { x: 0, y: 5 },
      width: 12,
      height: 5,
      config: { title: 'Recent events' },
      dataSource: createDataSource('recent-events'),
      filterConfig: { useGlobalFilters: true, acceptCrossWidgetFilters: true },
      localFilters: {},
      crossWidgetFilters: {},
    },
  ],
};
