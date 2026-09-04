import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/test/msw/server';
import {
  createHttpDashboardRepository,
  createHttpPersonalizationRepository,
  fetchDashboard,
  fetchPersonalization,
  isVersionConflict,
} from './httpDashboardRepository';
import type { Dashboard } from '../model/dashboardWidget';

const DASHBOARD_ID = 'dash-1';

const dashboard = {
  version: 1,
  metadata: {
    id: DASHBOARD_ID,
    title: 'Ops',
    ownerId: 'user-1',
    visibility: 'private',
    updatedAt: '2026-08-31T00:00:00.000Z',
  },
  globalFilters: {},
  widgets: [],
} as unknown as Dashboard;

function dashboardResponse(version: number) {
  return {
    success: true,
    data: {
      id: DASHBOARD_ID,
      title: 'Ops',
      ownerId: 'user-1',
      visibility: 'private',
      schemaVersion: 1,
      version,
      definition: dashboard,
      updatedAt: '2026-08-31T00:00:00.000Z',
    },
  };
}

function personalizationResponse(version: number) {
  return {
    success: true,
    data: {
      dashboardId: DASHBOARD_ID,
      userId: 'user-1',
      schemaVersion: 1,
      version,
      activePresetId: 'default',
      presets: [
        {
          id: 'default',
          name: 'My dashboard',
          createdAt: '2026-08-31T00:00:00.000Z',
          updatedAt: '2026-08-31T00:00:00.000Z',
          override: { hiddenWidgetIds: [], widgetOverrides: {}, addedWidgets: [] },
        },
      ],
      updatedAt: '2026-08-31T00:00:00.000Z',
    },
  };
}

const conflict = {
  success: false,
  error: {
    code: 'DASHBOARD_VERSION_CONFLICT',
    message: 'This dashboard changed since you loaded it.',
    details: { currentVersion: 7 },
  },
};

describe('http dashboard repository', () => {
  let sentVersions: number[];

  beforeEach(() => {
    sentVersions = [];
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('loads a dashboard and its version through the validated envelope', async () => {
    server.use(http.get('/api/dashboards/:id', () => HttpResponse.json(dashboardResponse(3))));

    const snapshot = await fetchDashboard(DASHBOARD_ID);

    expect(snapshot.version).toBe(3);
    expect(snapshot.value.metadata.id).toBe(DASHBOARD_ID);
  });

  /**
   * The whole point of the version travelling with the repository: the caller
   * never has to know it exists, and a second save from the same instance uses
   * the version the first one returned.
   */
  it('sends the version it last saw, and advances it after a save', async () => {
    server.use(
      http.put('/api/dashboards/:id', async ({ request }) => {
        const body = (await request.json()) as { expectedVersion: number };
        sentVersions.push(body.expectedVersion);
        return HttpResponse.json(dashboardResponse(body.expectedVersion + 1));
      }),
    );

    const repository = createHttpDashboardRepository(DASHBOARD_ID, { value: dashboard, version: 4 });

    await repository.save(dashboard);
    await repository.save(dashboard);

    expect(sentVersions).toEqual([4, 5]);
  });

  it('rejects with a recognisable conflict when the server has moved on', async () => {
    server.use(http.put('/api/dashboards/:id', () => HttpResponse.json(conflict, { status: 409 })));

    const repository = createHttpDashboardRepository(DASHBOARD_ID, { value: dashboard, version: 1 });

    await expect(repository.save(dashboard)).rejects.toThrow();

    await repository.save(dashboard).catch((error: unknown) => {
      expect(isVersionConflict(error)).toBe(true);
    });
  });

  /**
   * The rollback that matters: a failed save must not advance the local version,
   * or the next attempt sends a version the server never issued and fails for a
   * second, misleading reason.
   */
  it('does not advance its version after a failed save', async () => {
    server.use(
      http.put('/api/dashboards/:id', async ({ request }) => {
        const body = (await request.json()) as { expectedVersion: number };
        sentVersions.push(body.expectedVersion);
        return HttpResponse.json(conflict, { status: 409 });
      }),
    );

    const repository = createHttpDashboardRepository(DASHBOARD_ID, { value: dashboard, version: 2 });

    await repository.save(dashboard).catch(() => undefined);
    await repository.save(dashboard).catch(() => undefined);

    expect(sentVersions).toEqual([2, 2]);
  });

  it('keeps the last loaded dashboard readable after a failed save', async () => {
    server.use(http.put('/api/dashboards/:id', () => HttpResponse.json(conflict, { status: 409 })));

    const repository = createHttpDashboardRepository(DASHBOARD_ID, { value: dashboard, version: 1 });
    await repository.save({ ...dashboard, widgets: [] }).catch(() => undefined);

    expect(repository.load()?.metadata.id).toBe(DASHBOARD_ID);
  });
});

describe('http personalization repository', () => {
  afterEach(() => {
    server.resetHandlers();
  });

  it('loads the caller personalization', async () => {
    server.use(http.get('/api/dashboards/:id/personalization', () => HttpResponse.json(personalizationResponse(2))));

    const snapshot = await fetchPersonalization(DASHBOARD_ID);

    expect(snapshot.version).toBe(2);
    expect(snapshot.value.activePresetId).toBe('default');
  });

  /**
   * The server keys personalization by the authenticated user, so asking for
   * another user's is not a request this repository can make. Returning null is
   * the honest answer; returning the current user's would be silently wrong.
   */
  it('returns null when asked for another user', async () => {
    server.use(http.get('/api/dashboards/:id/personalization', () => HttpResponse.json(personalizationResponse(1))));

    const snapshot = await fetchPersonalization(DASHBOARD_ID);
    const repository = createHttpPersonalizationRepository(snapshot);

    expect(repository.load('user-1', DASHBOARD_ID)).not.toBeNull();
    expect(repository.load('someone-else', DASHBOARD_ID)).toBeNull();
  });

  it('propagates a conflict rather than swallowing it', async () => {
    server.use(
      http.get('/api/dashboards/:id/personalization', () => HttpResponse.json(personalizationResponse(1))),
      http.put('/api/dashboards/:id/personalization', () => HttpResponse.json(conflict, { status: 409 })),
    );

    const snapshot = await fetchPersonalization(DASHBOARD_ID);
    const repository = createHttpPersonalizationRepository(snapshot);

    await expect(repository.save(snapshot.value)).rejects.toThrow();
  });
});
