/**
 * The single decision about where data comes from.
 *
 * Three separate switches existed while each module was being built —
 * `VITE_DASHBOARD_REPOSITORY`, `VITE_TOPOLOGY_SOURCE`, `VITE_CHAT_SOURCE` — and
 * three switches is three ways to end up half-connected: a dashboard talking to
 * the server while chat still answers from a mock, with nothing to say which is
 * which. `VITE_DATA_MODE` decides for all of them.
 *
 * The per-module variables are still read, but only as an override *within* the
 * chosen mode, for the case where one module is being brought up against a real
 * server while the rest stay mocked.
 */
export type DataMode = 'mock' | 'server';

const rawMode: unknown = import.meta.env.VITE_DATA_MODE;

function resolveMode(): DataMode {
  if (rawMode === 'server') return 'server';
  if (rawMode === 'mock' || rawMode === undefined || rawMode === '') return 'mock';

  // A typo like `VITE_DATA_MODE=prod` must not silently mean "mock". Failing here
  // is loud and immediate; falling back would be neither.
  //
  // The value is described rather than stringified: `String()` on a non-string
  // produces "[object Object]", which says nothing about what was actually set.
  const received = typeof rawMode === 'string' ? `"${rawMode}"` : typeof rawMode;

  throw new Error(`VITE_DATA_MODE must be "mock" or "server". Received: ${received}`);
}

export const dataMode: DataMode = resolveMode();

/**
 * Mock mode in a production build is refused, not warned about.
 *
 * The failure it prevents is a deployed application that looks like it works —
 * it renders, it navigates, it shows data — while every number on the screen is
 * fabricated. Nobody notices that from the UI, which is exactly why it has to be
 * impossible rather than discouraged.
 */
if (import.meta.env.PROD && dataMode === 'mock') {
  throw new Error(
    'VITE_DATA_MODE=mock is not allowed in a production build. ' +
      'A production bundle running on mocks looks healthy while serving fabricated data.',
  );
}

/** A per-module override, valid only within the chosen mode. */
function moduleMode(value: unknown): DataMode {
  if (value === 'server') return 'server';
  if (value === 'mock') return 'mock';
  return dataMode;
}

export const dashboardMode = moduleMode(import.meta.env.VITE_DASHBOARD_REPOSITORY);
export const topologyMode = moduleMode(import.meta.env.VITE_TOPOLOGY_SOURCE);
export const chatMode = moduleMode(import.meta.env.VITE_CHAT_SOURCE);

/**
 * Whether MSW should start.
 *
 * Server mode must not install the worker at all: a mock handler that shadowed a
 * real endpoint would be almost impossible to spot, because the response would
 * look right.
 */
export const shouldStartMocks = dataMode === 'mock' && import.meta.env.DEV;
