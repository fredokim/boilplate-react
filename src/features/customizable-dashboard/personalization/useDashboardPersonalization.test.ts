import { act, renderHook } from '@testing-library/react';
import { initialDashboard } from '../model/initialDashboard';
import { createDashboardPersonalization, exportDashboardPersonalization } from './dashboardPersonalization';
import { createMemoryDashboardPersonalizationRepository } from './dashboardPersonalizationRepository';
import { useDashboardPersonalization } from './useDashboardPersonalization';

describe('dashboard personalization presets', () => {
  function firstPreset(personalization: ReturnType<typeof createDashboardPersonalization>) {
    const preset = personalization.presets[0];
    if (!preset) throw new Error('Default preset expected.');
    return preset;
  }

  it('duplicates the active preset and switches to it', () => {
    const personalization = createDashboardPersonalization('user-a', initialDashboard.metadata.id);
    firstPreset(personalization).override.globalFilters = { region: 'apac' };
    const repository = createMemoryDashboardPersonalizationRepository(personalization);
    const { result } = renderHook(() => useDashboardPersonalization(repository, 'user-a', initialDashboard.metadata.id));

    act(() => result.current.createPreset('APAC view'));

    expect(result.current.personalization.presets).toHaveLength(2);
    expect(result.current.personalization.presets[1]).toMatchObject({ name: 'APAC view', override: { globalFilters: { region: 'apac' } } });
    expect(result.current.personalization.activePresetId).toBe(result.current.personalization.presets[1]?.id);
  });

  it('resets only the active preset to the shared dashboard defaults', () => {
    const personalization = createDashboardPersonalization('user-a', initialDashboard.metadata.id);
    firstPreset(personalization).override.hiddenWidgetIds = ['monthly-revenue'];
    const repository = createMemoryDashboardPersonalizationRepository(personalization);
    const { result } = renderHook(() => useDashboardPersonalization(repository, 'user-a', initialDashboard.metadata.id));

    act(() => result.current.resetActivePreset());

    expect(result.current.personalization.presets[0]?.override).toEqual({ hiddenWidgetIds: [], widgetOverrides: {}, addedWidgets: [] });
  });

  it('does not delete the last remaining preset', () => {
    const repository = createMemoryDashboardPersonalizationRepository();
    const { result } = renderHook(() => useDashboardPersonalization(repository, 'user-a', initialDashboard.metadata.id));

    act(() => result.current.deleteActivePreset());

    expect(result.current.personalization.presets).toHaveLength(1);
    expect(result.current.personalization.activePresetId).toBe('default');
  });

  it('imports presets for the current user but rejects another dashboard', () => {
    const repository = createMemoryDashboardPersonalizationRepository();
    const { result } = renderHook(() => useDashboardPersonalization(repository, 'current-user', initialDashboard.metadata.id));
    const imported = createDashboardPersonalization('another-user', initialDashboard.metadata.id);
    firstPreset(imported).name = 'Imported preset';

    act(() => result.current.importJson(exportDashboardPersonalization(imported)));
    expect(result.current.personalization.userId).toBe('current-user');
    expect(result.current.personalization.presets[0]?.name).toBe('Imported preset');

    const wrongDashboard = createDashboardPersonalization('another-user', 'another-dashboard');
    act(() => result.current.importJson(exportDashboardPersonalization(wrongDashboard)));
    expect(result.current.error).toBe('Personalization belongs to a different dashboard.');
  });
});
