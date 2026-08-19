import type { Dashboard } from '../model/dashboardWidget';
import type { DashboardRepository } from '../persistence/dashboardRepository';
import {
  applyDashboardPersonalization,
  createDashboardPersonalization,
  deriveDashboardPersonalization,
  type DashboardPersonalization,
  isDashboardPersonalization,
} from './dashboardPersonalization';

export interface DashboardPersonalizationRepository {
  load: (userId: string, dashboardId: string) => DashboardPersonalization | null;
  save: (personalization: DashboardPersonalization) => Promise<void>;
}

export function createLocalStorageDashboardPersonalizationRepository(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  keyPrefix = 'customizable-dashboard-personalization',
): DashboardPersonalizationRepository {
  const key = (userId: string, dashboardId: string) => `${keyPrefix}:${userId}:${dashboardId}`;
  return {
    load: (userId, dashboardId) => {
      const serialized = storage.getItem(key(userId, dashboardId));
      if (!serialized) return null;
      try {
        const parsed: unknown = JSON.parse(serialized);
        return isDashboardPersonalization(parsed) ? structuredClone(parsed) : null;
      } catch {
        return null;
      }
    },
    save: async (personalization) => {
      storage.setItem(key(personalization.userId, personalization.dashboardId), JSON.stringify(personalization));
    },
  };
}

export function createMemoryDashboardPersonalizationRepository(
  initialValue: DashboardPersonalization | null = null,
): DashboardPersonalizationRepository {
  const values = new Map<string, DashboardPersonalization>();
  const key = (userId: string, dashboardId: string) => `${userId}:${dashboardId}`;
  if (initialValue) values.set(key(initialValue.userId, initialValue.dashboardId), structuredClone(initialValue));
  return {
    load: (userId, dashboardId) => {
      const value = values.get(key(userId, dashboardId));
      return value ? structuredClone(value) : null;
    },
    save: async (personalization) => {
      values.set(key(personalization.userId, personalization.dashboardId), structuredClone(personalization));
    },
  };
}

export function createPersonalizedDashboardRepository(
  baseDashboard: Dashboard,
  personalization: DashboardPersonalization,
  presetId: string,
  repository: DashboardPersonalizationRepository,
  onSaved?: (personalization: DashboardPersonalization) => void,
): DashboardRepository {
  const selectedPreset = personalization.presets.find((preset) => preset.id === presetId);
  if (!selectedPreset) throw new Error(`Dashboard preset ${presetId} was not found.`);
  return {
    load: () => applyDashboardPersonalization(baseDashboard, selectedPreset.override),
    save: async (dashboard) => {
      const updatedAt = new Date().toISOString();
      const next = {
        ...personalization,
        activePresetId: presetId,
        presets: personalization.presets.map((preset) => preset.id === presetId
          ? { ...preset, updatedAt, override: deriveDashboardPersonalization(baseDashboard, dashboard) }
          : preset),
      };
      await repository.save(next);
      onSaved?.(next);
    },
  };
}

export function loadDashboardPersonalization(
  repository: DashboardPersonalizationRepository,
  userId: string,
  dashboardId: string,
) {
  return repository.load(userId, dashboardId) ?? createDashboardPersonalization(userId, dashboardId);
}
