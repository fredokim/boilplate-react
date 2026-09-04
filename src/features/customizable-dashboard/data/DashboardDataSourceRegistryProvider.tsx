import type { PropsWithChildren } from 'react';
import type { DashboardDataSourceRegistry } from './dashboardDataSourceRegistry';
import { DashboardDataSourceRegistryContext } from './dashboardDataSourceRegistryContext';

export function DashboardDataSourceRegistryProvider({
  children,
  registry,
}: PropsWithChildren<{ registry: DashboardDataSourceRegistry }>) {
  return (
    <DashboardDataSourceRegistryContext.Provider value={registry}>
      {children}
    </DashboardDataSourceRegistryContext.Provider>
  );
}
