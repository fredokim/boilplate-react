import { describe, expect, it, vi } from 'vitest';
import { hasBeenRetried, markRetried, RefreshSingleFlight } from './refreshSingleFlight';

describe('RefreshSingleFlight', () => {
  /**
   * The behaviour the whole class exists for. With a rotating refresh token,
   * five parallel refreshes mean four replays of an already-spent token — which
   * the server correctly reads as theft and answers by revoking the session
   * family. Coalescing is what stops a page load from logging the user out.
   */
  it('performs one refresh for many concurrent callers', async () => {
    let resolveRefresh: ((token: string) => void) | undefined;
    const refresh = vi.fn(
      () =>
        new Promise<string | null>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    const flight = new RefreshSingleFlight(refresh);

    const waiters = [flight.run(), flight.run(), flight.run(), flight.run(), flight.run()];
    resolveRefresh?.('new-token');

    await expect(Promise.all(waiters)).resolves.toEqual([
      'new-token',
      'new-token',
      'new-token',
      'new-token',
      'new-token',
    ]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('starts a new refresh once the previous one settled', async () => {
    const refresh = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second');
    const flight = new RefreshSingleFlight(refresh);

    await expect(flight.run()).resolves.toBe('first');
    await expect(flight.run()).resolves.toBe('second');
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  /**
   * The promise has to be cleared on failure too, or every later 401 re-awaits a
   * settled rejection and the session can never recover.
   */
  it('does not wedge after a failed refresh', async () => {
    const refresh = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce('recovered');
    const flight = new RefreshSingleFlight(refresh);

    await expect(flight.run()).rejects.toThrow('network');
    await expect(flight.run()).resolves.toBe('recovered');
  });

  it('reports whether a refresh is in progress', async () => {
    let resolveRefresh: ((token: string | null) => void) | undefined;
    const flight = new RefreshSingleFlight(
      () =>
        new Promise<string | null>((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    expect(flight.isRefreshing).toBe(false);
    const running = flight.run();
    expect(flight.isRefreshing).toBe(true);

    resolveRefresh?.(null);
    await running;
    expect(flight.isRefreshing).toBe(false);
  });

  it('propagates a null token when the refresh could not produce one', async () => {
    const flight = new RefreshSingleFlight(() => Promise.resolve(null));

    await expect(flight.run()).resolves.toBeNull();
  });
});

describe('retry marking', () => {
  /** Without this a permanently failing 401 loops until the tab is closed. */
  it('marks a config so it is retried at most once', () => {
    const config = { url: '/users' };

    expect(hasBeenRetried(config)).toBe(false);
    expect(hasBeenRetried(markRetried(config))).toBe(true);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'config'],
  ])('treats %s as not retried', (_label, value) => {
    expect(hasBeenRetried(value)).toBe(false);
  });
});
