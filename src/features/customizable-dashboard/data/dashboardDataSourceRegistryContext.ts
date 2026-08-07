import { createContext, useContext } from 'react';
import { dashboardDataSourceRegistry } from './dashboardDataSourceRegistry';

export const DashboardDataSourceRegistryContext = createContext(dashboardDataSourceRegistry);

export function useDashboardDataSourceRegistry() {
  return useContext(DashboardDataSourceRegistryContext);
}
