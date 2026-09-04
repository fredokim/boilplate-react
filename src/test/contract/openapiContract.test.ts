import { existsSync, readdirSync, readFileSync } from 'node:fs';
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

/**
 * A copy of the backend's published spec, kept in this repository.
 *
 * The server used to be a sibling directory; it is now its own repository
 * shared by three frontends, so the spec is vendored rather than read across a
 * path that no longer exists. `npm run contract:sync` refreshes it from a local
 * checkout of boilplate-server.
 *
 * The cost of vendoring is stated plainly: this copy can fall behind the server
 * without anything here noticing. What it still catches is the failure it was
 * written for — the frontend calling an endpoint that the spec it was built
 * against does not describe.
 */
const SPEC_PATH = resolve(__dirname, '../../../contracts/openapi.json');

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

/**
 * Every URL the api modules pass to `requestDto`, reduced to a comparable path
 * shape: each template expression becomes `{}`, and the shared `/api` prefix is
 * added because the client's axios instance carries it as its baseURL.
 *
 * Parameter *names* are deliberately discarded. The client writes whatever
 * expression it has to hand — `${personalization.dashboardId}` — while the
 * server names the placeholder in its route decorator. Comparing the names
 * reports a mismatch for two spellings of the same endpoint; comparing the
 * shapes reports only a route that genuinely has nothing behind it.
 */
function frontendEndpoints(): string[] {
  const apiDir = resolve(__dirname, '../../features');
  const found = new Set<string>();

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);

      if (entry.isDirectory()) {
        walk(full);
        continue;
      }

      if (!entry.name.endsWith('.ts') || entry.name.includes('.test.')) continue;

      const source = readFileSync(full, 'utf8');

      for (const match of source.matchAll(/url: [`']([^`']+)[`']/g)) {
        const raw = match[1];
        if (!raw?.startsWith('/')) continue;

        found.add(`/api${raw.replace(/\$\{[^}]*\}/g, '{}')}`);
      }
    }
  };

  walk(apiDir);

  return [...found].sort();
}

function propertiesOf(schema: string): string[] {
  return Object.keys(spec?.components.schemas[schema]?.properties ?? {}).sort();
}

describeIfSpec('server contract', () => {
  /**
   * The endpoint list is derived from the source rather than written by hand.
   *
   * The hand-written version missed `/users` — an endpoint the dashboard has
   * always called and the server never implemented. It listed what had been
   * built rather than what the client asks for, so it agreed with itself and
   * proved nothing. Reading the api modules makes the test fail when a call has
   * no route behind it, which is the only version worth having.
   */
  it('publishes every endpoint the frontend calls', () => {
    const published = new Set(Object.keys(spec?.paths ?? {}).map((path) => path.replace(/\{[^}]*\}/g, '{}')));

    const called = frontendEndpoints();

    // A walk that finds nothing would pass this test forever. It has caught a
    // real endpoint before, so an empty result means the scan broke, not that
    // the frontend stopped calling anything.
    expect(called.length).toBeGreaterThan(5);

    expect(called.filter((endpoint) => !published.has(endpoint))).toEqual([]);
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
