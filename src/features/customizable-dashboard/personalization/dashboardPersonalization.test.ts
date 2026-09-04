import { createDataSource } from '../data/dashboardDataSource';
import { initialDashboard } from '../model/initialDashboard';
import { createWidget } from '../widgets/widgetRegistry';
import {
  applyDashboardPersonalization,
  createDashboardPersonalization,
  deriveDashboardPersonalization,
  exportDashboardPersonalization,
  getActiveDashboardPreset,
  importDashboardPersonalization,
} from './dashboardPersonalization';
import {
  createLocalStorageDashboardPersonalizationRepository,
  createMemoryDashboardPersonalizationRepository,
  createPersonalizedDashboardRepository,
  loadDashboardPersonalization,
} from './dashboardPersonalizationRepository';

describe('dashboard personalization', () => {
  function requireFirst<T>(values: T[]): T {
    const value = values[0];
    if (!value) throw new Error('First item expected.');
    return value;
  }

  it('starts from the shared dashboard without copying it into the override', () => {
    const personalization = createDashboardPersonalization('user-a', initialDashboard.metadata.id, '2026-08-19T00:00:00.000Z');
    const preset = getActiveDashboardPreset(personalization);

    expect(preset.override).toEqual({ hiddenWidgetIds: [], widgetOverrides: {}, addedWidgets: [] });
    expect(applyDashboardPersonalization(initialDashboard, preset.override)).toEqual(initialDashboard);
  });

  it('stores only changed, hidden, added and filter personalization', () => {
    const changedWidgets = initialDashboard.widgets
      .filter((widget) => widget.id !== 'recent-events')
      .map((widget) => widget.id === 'monthly-revenue'
        ? { ...widget, position: { x: 5, y: 2 }, dataSource: createDataSource('active-users') }
        : widget);
    const added = createWidget('kpi', 'personal-kpi', { x: 0, y: 12 });
    const personalized = {
      ...initialDashboard,
      globalFilters: { region: 'apac' },
      widgets: [...changedWidgets, added],
    };

    const override = deriveDashboardPersonalization(initialDashboard, personalized);
    const restored = applyDashboardPersonalization(initialDashboard, override);

    expect(override.hiddenWidgetIds).toEqual(['recent-events']);
    expect(Object.keys(override.widgetOverrides)).toEqual(['monthly-revenue']);
    expect(override.addedWidgets).toHaveLength(1);
    expect(restored).toEqual(personalized);
  });

  it('keeps unchanged base widgets structurally independent from personalized output', () => {
    const result = applyDashboardPersonalization(initialDashboard, {
      hiddenWidgetIds: [], widgetOverrides: {}, addedWidgets: [],
    });

    requireFirst(result.widgets).config.title = 'Changed locally';

    expect(initialDashboard.widgets[0]?.config.title).toBe('Monthly revenue');
  });

  it('persists a saved dashboard through the existing DashboardRepository contract', async () => {
    const personalization = createDashboardPersonalization('user-a', initialDashboard.metadata.id);
    const repository = createMemoryDashboardPersonalizationRepository(personalization);
    let savedPersonalization = personalization;
    const dashboardRepository = createPersonalizedDashboardRepository(
      initialDashboard, personalization, 'default', repository, (next) => { savedPersonalization = next; },
    );
    const personalized = structuredClone(initialDashboard);
    requireFirst(personalized.widgets).width = 8;

    await dashboardRepository.save(personalized);

    expect(getActiveDashboardPreset(savedPersonalization).override.widgetOverrides['monthly-revenue']?.width).toBe(8);
    expect(dashboardRepository.load()?.widgets[0]?.width).toBe(4);
    const reloaded = createPersonalizedDashboardRepository(initialDashboard, savedPersonalization, 'default', repository);
    expect(reloaded.load()?.widgets[0]?.width).toBe(8);
  });

  it('isolates personalization by user and dashboard', async () => {
    const repository = createMemoryDashboardPersonalizationRepository();
    const userA = createDashboardPersonalization('user-a', 'dashboard-a');
    const userB = createDashboardPersonalization('user-b', 'dashboard-a');
    requireFirst(userA.presets).name = 'A preset';
    requireFirst(userB.presets).name = 'B preset';
    await repository.save(userA);
    await repository.save(userB);

    expect(repository.load('user-a', 'dashboard-a')?.presets[0]?.name).toBe('A preset');
    expect(repository.load('user-b', 'dashboard-a')?.presets[0]?.name).toBe('B preset');
    expect(repository.load('user-a', 'dashboard-b')).toBeNull();
  });

  it('round-trips personalization JSON and rejects another schema', () => {
    const personalization = createDashboardPersonalization('user-a', initialDashboard.metadata.id);

    expect(importDashboardPersonalization(exportDashboardPersonalization(personalization))).toEqual(personalization);
    expect(() => importDashboardPersonalization('{"version":2}')).toThrow('schema version 1');
  });

  it('uses a user-scoped localStorage key and ignores invalid stored data', async () => {
    const storageKey = 'personalization-contract';
    const repository = createLocalStorageDashboardPersonalizationRepository(window.localStorage, storageKey);
    const personalization = createDashboardPersonalization('user-a', initialDashboard.metadata.id);
    await repository.save(personalization);

    expect(repository.load('user-a', initialDashboard.metadata.id)).toEqual(personalization);
    expect(repository.load('user-b', initialDashboard.metadata.id)).toBeNull();
    window.localStorage.setItem(`${storageKey}:broken:${initialDashboard.metadata.id}`, 'not-json');
    expect(repository.load('broken', initialDashboard.metadata.id)).toBeNull();
  });

  it('creates a default preset when no persisted personalization exists', () => {
    const repository = createMemoryDashboardPersonalizationRepository();
    const personalization = loadDashboardPersonalization(repository, 'user-a', initialDashboard.metadata.id);

    expect(personalization.activePresetId).toBe('default');
    expect(personalization.presets).toHaveLength(1);
  });
});
