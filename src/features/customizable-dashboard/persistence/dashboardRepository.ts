import type { Dashboard } from '../model/dashboardWidget';
import { isDashboardSchema } from '../model/dashboardSerialization';

export interface DashboardRepository {
  load: () => Dashboard | null;
  save: (dashboard: Dashboard) => Promise<void>;
}

export function createLocalStorageDashboardRepository(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  storageKey = 'customizable-dashboard',
): DashboardRepository {
  return {
    load: () => {
      const serializedDashboard = storage.getItem(storageKey);
      if (!serializedDashboard) {
        return null;
      }

      try {
        const dashboard: unknown = JSON.parse(serializedDashboard);
        return isDashboardSchema(dashboard) ? structuredClone(dashboard) : null;
      } catch {
        return null;
      }
    },
    save: async (dashboard) => storage.setItem(storageKey, JSON.stringify(dashboard)),
  };
}

export function createMemoryDashboardRepository(initialValue: Dashboard | null = null): DashboardRepository {
  let storedDashboard = initialValue ? structuredClone(initialValue) : null;

  return {
    load: () => (storedDashboard ? structuredClone(storedDashboard) : null),
    save: async (dashboard) => {
      storedDashboard = structuredClone(dashboard);
    },
  };
}

export function createFailingDashboardRepository(
  initialValue: Dashboard,
  error = new Error('Dashboard could not be saved.'),
): DashboardRepository {
  return {
    load: () => structuredClone(initialValue),
    save: async () => Promise.reject(error),
  };
}
