import { afterEach, describe, expect, it, vi } from 'vitest';
import { TypedApiError } from './failure';
import { describeFailure, failureKeyOf, failureStatus, type FailureKey } from './failureStatus';

const ALL: FailureKey[] = [
  'offline',
  'unreachable',
  'waking',
  'timeout',
  'unauthorized',
  'forbidden',
  'not-found',
  'server',
  'contract',
  'unknown',
];

function withOnline(online: boolean) {
  const spy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online);
  return () => spy.mockRestore();
}

describe('failureStatus', () => {
  afterEach(() => vi.restoreAllMocks());

  it('has a sentence for every key', () => {
    for (const key of ALL) {
      const status = failureStatus(key);
      expect(status.title).toBeTruthy();
      expect(status.detail).toBeTruthy();
      expect(['warning', 'error']).toContain(status.tone);
    }
  });

  /**
   * A host refusing to wake a sleeping instance is not a lost connection, and
   * it is the only failure here that fixes itself while the reader waits. It
   * used to fall through to `unknown` -- "The cause is not known" -- which is
   * the one thing that was not true about it.
   */
  it('says a sleeping server is starting rather than unknown', () => {
    const key = failureKeyOf({ origin: 'network', kind: 'waking', message: '', status: 429 });

    expect(key).toBe('waking');
    expect(failureStatus(key).tone).toBe('warning');
    expect(failureStatus(key).retryable).toBe(true);
    expect(failureStatus(key).detail).toMatch(/minute/i);
  });

  it('does not offer a retry that cannot work', () => {
    // Retrying a 403 or a schema mismatch produces the same failure forever.
    // Offering the button teaches people it does nothing.
    expect(failureStatus('forbidden').retryable).toBe(false);
    expect(failureStatus('not-found').retryable).toBe(false);
    expect(failureStatus('contract').retryable).toBe(false);
  });

  it('offers a retry where waiting plausibly helps', () => {
    expect(failureStatus('offline').retryable).toBe(true);
    expect(failureStatus('unreachable').retryable).toBe(true);
    expect(failureStatus('timeout').retryable).toBe(true);
    expect(failureStatus('server').retryable).toBe(true);
  });

  it('never shows the reader a stack trace or an identifier', () => {
    for (const key of ALL) {
      const status = failureStatus(key);
      expect(status.title).not.toMatch(/Error:|\bundefined\b|_|[A-Z]{4,}/);
    }
  });
});

describe('failureKeyOf', () => {
  afterEach(() => vi.restoreAllMocks());

  it('calls a network failure offline only when the device is offline', () => {
    const restore = withOnline(false);
    expect(failureKeyOf({ origin: 'network', kind: 'unknown', message: '' })).toBe('offline');
    restore();

    const restoreOnline = withOnline(true);
    expect(failureKeyOf({ origin: 'network', kind: 'unknown', message: '' })).toBe('unreachable');
    restoreOnline();
  });

  it('separates "sign in again" from "you may not"', () => {
    expect(failureKeyOf({ origin: 'backend', kind: 'auth', message: '' })).toBe('unauthorized');
    expect(failureKeyOf({ origin: 'backend', kind: 'auth', message: '', status: 403 })).toBe('forbidden');
  });

  it('reads a contract mismatch as the server surprising us, not the reader erring', () => {
    expect(failureKeyOf({ origin: 'frontend', kind: 'validation', message: '' })).toBe('contract');
    expect(failureStatus('contract').detail).not.toMatch(/you|your/i);
  });

  it('falls back to the status code when the kind says nothing', () => {
    expect(failureKeyOf({ origin: 'backend', kind: 'unknown', message: '', status: 503 })).toBe('server');
    expect(failureKeyOf({ origin: 'backend', kind: 'unknown', message: '', status: 401 })).toBe('unauthorized');
    expect(failureKeyOf({ origin: 'backend', kind: 'unknown', message: '' })).toBe('unknown');
  });
});

describe('describeFailure', () => {
  it('accepts whatever was thrown', () => {
    expect(describeFailure(new TypedApiError({ origin: 'backend', kind: 'server', message: 'boom' })).title).toBe(
      'Server error',
    );
    expect(describeFailure(new Error('plain')).title).toBe('Something went wrong');
    expect(describeFailure('a string').title).toBeTruthy();
  });
});
