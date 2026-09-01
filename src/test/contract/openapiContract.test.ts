import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Checks the frontend's assumptions against the server's published OpenAPI
 * document.
 *
 * This is a consumer contract test, and what it is protecting against is
 * specific: the frontend validates every response with class-validator, so a
 * server that renames a field produces a *runtime* failure in the browser —
 * with a message pointing at the DTO rather than at the server that changed.
 * Comparing the two here turns that into a failing test next to the change.
 *
 * It reads the committed spec rather than starting the server: the spec is what
 * a consumer would be handed, and the server has its own drift check making sure
 * it stays true.
 */

const SPEC_PATH = resolve(__dirname, '../../../server/openapi.json');

type OpenApiDocument = {
  paths: Record<string, Record<string, unknown>>;
  components: { schemas: Record<string, { properties?: Record<string, unknown>; required?: string[] }> };
};

function loadSpec(): OpenApiDocument | null {
  if (!existsSync(SPEC_PATH)) return null;

  return JSON.parse(readFileSync(SPEC_PATH, 'utf8')) as OpenApiDocument;
}

const spec = loadSpec();

/**
 * The server package is a sibling, not a dependency. Skipping rather than failing
 * when the spec is absent keeps `npm test` working for someone who only cloned
 * the frontend — CI runs both, so the check is not lost.
 */
const describeIfSpec = spec ? describe : describe.skip;

function propertiesOf(schema: string): string[] {
  return Object.keys(spec?.components.schemas[schema]?.properties ?? {}).sort();
}

describeIfSpec('server contract', () => {
  it('publishes every endpoint the frontend calls', () => {
    const called = [
      '/api/auth/login',
      '/api/auth/session',
      '/api/auth/refresh',
      '/api/auth/logout',
      '/api/dashboard/summary',
      '/api/dashboard/kpi',
      '/api/dashboard/chart',
      '/api/dashboard/table',
      '/api/dashboards/{dashboardId}',
      '/api/dashboards/{dashboardId}/personalization',
      '/api/graphs/{graphId}',
      '/api/graphs/{graphId}/topology/snapshot',
      '/api/live/broadcasts/{broadcastId}',
      '/api/live/broadcasts/{broadcastId}/chat/messages',
    ];

    expect(Object.keys(spec?.paths ?? {})).toEqual(expect.arrayContaining(called));
  });

  /**
   * The frontend's `AuthUserDto` declares exactly these four. A fifth would be
   * stripped by `whitelist: true` and a missing one fails validation, so this is
   * the field list the login screen depends on.
   */
  it('matches the auth user shape the frontend DTO validates', () => {
    expect(propertiesOf('AuthUserResponseDto')).toEqual(['email', 'id', 'name', 'permissions']);
  });

  it('matches the login result shape', () => {
    expect(propertiesOf('LoginResponseDto')).toEqual(['accessToken', 'user']);
  });

  it('matches the session shape', () => {
    expect(propertiesOf('SessionResponseDto')).toEqual(['user']);
  });

  /** These are the fields the widget DTOs validate on arrival. */
  it('matches the widget data shapes', () => {
    expect(propertiesOf('KpiDataDto')).toEqual(['kind', 'label', 'trend', 'value']);
    expect(propertiesOf('SeriesDataDto')).toEqual(['kind', 'points']);
    expect(propertiesOf('TableDataDto')).toEqual(['columns', 'kind', 'rows']);
  });

  it('carries the version the dashboard optimistic lock depends on', () => {
    expect(propertiesOf('DashboardResponseDto')).toContain('version');
    expect(propertiesOf('PersonalizationResponseDto')).toEqual(
      expect.arrayContaining(['activePresetId', 'presets', 'version']),
    );
  });

  it('describes the topology snapshot the runtime store seeds from', () => {
    expect(propertiesOf('TopologySnapshotDto')).toEqual(['capturedAt', 'edges', 'nodes', 'revision', 'topologyId']);
  });

  /** The chat store orders on `sequence` and dedupes on `id`. */
  it('describes the chat message fields the store orders and dedupes on', () => {
    expect(propertiesOf('ChatMessageDto')).toEqual(
      expect.arrayContaining(['id', 'clientMessageId', 'sequence', 'sentAt', 'deleted']),
    );
  });

  /**
   * The error envelope is the one shape every failure path shares, and the
   * frontend branches on `error.code`.
   */
  it('publishes the shared error envelope', () => {
    const envelope = spec?.components.schemas.ApiErrorEnvelope;
    const error = (envelope?.properties?.error ?? {}) as { required?: string[] };

    expect(Object.keys(envelope?.properties ?? {}).sort()).toEqual(['error', 'success']);
    expect(error.required).toEqual(expect.arrayContaining(['code', 'message']));
  });
});
