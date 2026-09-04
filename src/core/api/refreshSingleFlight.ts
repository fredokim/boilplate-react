/**
 * Ensures a token refresh happens once, however many requests hit 401 together.
 *
 * The failure this prevents is specific and easy to reach: a page that fires five
 * requests on load, all of which 401 on an expired token, all of which then call
 * refresh. With a rotating refresh token that is not merely wasteful — the first
 * refresh rotates the token and the other four present one that has already been
 * spent, which the server correctly reads as a replay and revokes the whole
 * session family. Five parallel refreshes log the user out.
 *
 * So the first caller performs the refresh and every other caller awaits the same
 * promise.
 */
export class RefreshSingleFlight {
  private inFlight: Promise<string | null> | null = null;

  constructor(private readonly refresh: () => Promise<string | null>) {}

  /**
   * Returns the new access token, or null when the refresh failed.
   *
   * The promise is cleared in `finally`, so a later 401 starts a fresh attempt
   * rather than re-awaiting a settled failure forever.
   */
  run(): Promise<string | null> {
    this.inFlight ??= this.refresh().finally(() => {
      this.inFlight = null;
    });

    return this.inFlight;
  }

  /** True while a refresh is running. Exposed for tests and diagnostics. */
  get isRefreshing(): boolean {
    return this.inFlight !== null;
  }
}

/**
 * Marks a request as already retried, so one failure cannot loop.
 *
 * Without it a 401 triggers a refresh, the retry 401s again — a revoked session,
 * a clock skew, a server that always rejects — and the cycle repeats until the
 * tab is closed.
 */
export const RETRY_FLAG = '__rbRetried';

export function hasBeenRetried(config: unknown): boolean {
  return typeof config === 'object' && config !== null && (config as Record<string, unknown>)[RETRY_FLAG] === true;
}

export function markRetried<T extends object>(config: T): T {
  return Object.assign(config, { [RETRY_FLAG]: true });
}
