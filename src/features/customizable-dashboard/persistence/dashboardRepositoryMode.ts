import { dashboardMode } from '@core/config/dataMode';

/**
 * Where dashboard definitions and personalization are stored.
 *
 * `local` is the localStorage and memory repositories the app has always used;
 * `server` is the HTTP ones. The decision itself lives in
 * `core/config/dataMode.ts` — one switch for the whole application, so it cannot
 * end up half-connected with the dashboard on the server and everything else on
 * mocks.
 */
export type DashboardRepositoryMode = 'local' | 'server';

export const dashboardRepositoryMode: DashboardRepositoryMode = dashboardMode === 'server' ? 'server' : 'local';

export const isServerBackedDashboard = dashboardRepositoryMode === 'server';
