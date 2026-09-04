import { useCallback, useState } from 'react';
import {
  createEmptyPersonalizationOverride,
  exportDashboardPersonalization,
  importDashboardPersonalization,
  type DashboardPersonalization,
} from './dashboardPersonalization';
import {
  loadDashboardPersonalization,
  type DashboardPersonalizationRepository,
} from './dashboardPersonalizationRepository';

export function useDashboardPersonalization(
  repository: DashboardPersonalizationRepository,
  userId: string,
  dashboardId: string,
) {
  const [personalization, setPersonalization] = useState(() => loadDashboardPersonalization(repository, userId, dashboardId));
  const [error, setError] = useState<string | null>(null);

  const persist = useCallback((next: DashboardPersonalization) => {
    setPersonalization(next);
    setError(null);
    void repository.save(next).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Personalization could not be saved.');
    });
  }, [repository]);

  const selectPreset = useCallback((presetId: string) => {
    if (!personalization.presets.some((preset) => preset.id === presetId)) return;
    persist({ ...personalization, activePresetId: presetId });
  }, [persist, personalization]);

  const createPreset = useCallback((name: string) => {
    const source = personalization.presets.find((preset) => preset.id === personalization.activePresetId);
    const now = new Date().toISOString();
    const id = `preset-${crypto.randomUUID()}`;
    persist({
      ...personalization,
      activePresetId: id,
      presets: [...personalization.presets, {
        id,
        name: name.trim() || `Preset ${String(personalization.presets.length + 1)}`,
        createdAt: now,
        updatedAt: now,
        override: structuredClone(source?.override ?? createEmptyPersonalizationOverride()),
      }],
    });
  }, [persist, personalization]);

  const resetActivePreset = useCallback(() => {
    const now = new Date().toISOString();
    persist({
      ...personalization,
      presets: personalization.presets.map((preset) => preset.id === personalization.activePresetId
        ? { ...preset, updatedAt: now, override: createEmptyPersonalizationOverride() }
        : preset),
    });
  }, [persist, personalization]);

  const deleteActivePreset = useCallback(() => {
    if (personalization.presets.length <= 1) return;
    const presets = personalization.presets.filter((preset) => preset.id !== personalization.activePresetId);
    const first = presets[0];
    if (!first) return;
    persist({ ...personalization, presets, activePresetId: first.id });
  }, [persist, personalization]);

  const importJson = useCallback((serialized: string) => {
    try {
      const imported = importDashboardPersonalization(serialized);
      if (imported.dashboardId !== dashboardId) throw new Error('Personalization belongs to a different dashboard.');
      persist({ ...imported, userId });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Personalization import failed.');
    }
  }, [dashboardId, persist, userId]);

  return {
    personalization,
    error,
    selectPreset,
    createPreset,
    resetActivePreset,
    deleteActivePreset,
    importJson,
    exportJson: () => exportDashboardPersonalization(personalization),
    replacePersonalization: setPersonalization,
  };
}
