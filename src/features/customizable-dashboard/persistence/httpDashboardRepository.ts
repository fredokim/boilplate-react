import { requestDto } from '@core/api/apiClient';
import { TypedApiError } from '@core/result/failure';
import type { Dashboard } from '../model/dashboardWidget';
import type { DashboardPersonalization } from '../personalization/dashboardPersonalization';
import { DashboardResponseDto, PersonalizationResponseDto } from './dashboardHttp.dto';
import type { DashboardRepository } from './dashboardRepository';
import type { DashboardPersonalizationRepository } from '../personalization/dashboardPersonalizationRepository';

/**
 * Server-backed implementations of the two repository contracts.
 *
 * The localStorage and memory versions are untouched and remain the default —
 * `dashboardRepositoryFactory.ts` decides which is used. Nothing here changes how
 * the dashboard behaves offline.
 *
 * One shape difference is worth stating: `DashboardRepository.load` is
 * synchronous, because localStorage is. HTTP is not, so the server-backed loader
 * is a separate async function and the repository returned by `create…` closes
 * over what that already fetched. That keeps the existing contract intact rather
 * than making every caller await a read that used to be instant.
 */

/** Server version numbers, kept outside the domain model so `Dashboard` stays unchanged. */
type VersionedSnapshot<TValue> = {
  value: TValue;
  version: number;
};

export async function fetchDashboard(dashboardId: string): Promise<VersionedSnapshot<Dashboard>> {
  const response = await requestDto({ method: 'GET', url: `/dashboards/${dashboardId}` }, DashboardResponseDto);

  return { value: response.definition as unknown as Dashboard, version: response.version };
}

export async function fetchPersonalization(dashboardId: string): Promise<VersionedSnapshot<DashboardPersonalization>> {
  const response = await requestDto(
    { method: 'GET', url: `/dashboards/${dashboardId}/personalization` },
    PersonalizationResponseDto,
  );

  return {
    value: {
      version: 1,
      userId: response.userId,
      dashboardId: response.dashboardId,
      activePresetId: response.activePresetId,
      presets: response.presets as unknown as DashboardPersonalization['presets'],
    },
    version: response.version,
  };
}

/**
 * Wraps a fetched dashboard so saves go to the server.
 *
 * The version travels with the repository, not with the caller, and is advanced
 * on every successful write. That is what makes a second save from the same
 * instance legal while a save from a stale instance is the 409 this exists to
 * produce.
 */
export function createHttpDashboardRepository(
  dashboardId: string,
  snapshot: VersionedSnapshot<Dashboard>,
): DashboardRepository {
  let current = snapshot;

  return {
    load: () => structuredClone(current.value),
    save: async (dashboard) => {
      const response = await requestDto(
        {
          method: 'PUT',
          url: `/dashboards/${dashboardId}`,
          data: { expectedVersion: current.version, definition: dashboard },
        },
        DashboardResponseDto,
      );

      current = { value: response.definition as unknown as Dashboard, version: response.version };
    },
  };
}

export function createHttpPersonalizationRepository(
  snapshot: VersionedSnapshot<DashboardPersonalization>,
): DashboardPersonalizationRepository {
  let current = snapshot;

  return {
    load: (userId, dashboardId) => {
      // The server keys personalization by the authenticated user, so a request
      // for someone else's is not something this repository can express. Return
      // null rather than quietly handing back the wrong person's presets.
      if (current.value.userId !== userId || current.value.dashboardId !== dashboardId) return null;

      return structuredClone(current.value);
    },
    save: async (personalization) => {
      const response = await requestDto(
        {
          method: 'PUT',
          url: `/dashboards/${personalization.dashboardId}/personalization`,
          data: {
            expectedVersion: current.version,
            activePresetId: personalization.activePresetId,
            presets: personalization.presets,
          },
        },
        PersonalizationResponseDto,
      );

      current = { value: { ...personalization, presets: personalization.presets }, version: response.version };
    },
  };
}

/**
 * True when a failure is the server saying "someone else wrote first".
 *
 * A 409 is not a bug and not a network problem: the correct response is to
 * re-read and let the person decide, which is a different branch from a retry.
 */
export function isVersionConflict(error: unknown): boolean {
  if (!(error instanceof TypedApiError)) return false;

  const details = error.failure.details as { code?: string } | undefined;

  return error.failure.status === 409 || details?.code === 'DASHBOARD_VERSION_CONFLICT';
}
