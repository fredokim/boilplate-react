import { toFailure, type AppFailure } from './failure';

/**
 * What a failed request means to the person looking at it.
 *
 * The three boilerplates classify failures three different ways -- this one has
 * `kind: 'auth'`, Next has `origin: 'auth'` and `kind: 'unauthorized'`, Vue has
 * `kind: 'http_status'` -- and each grew its own wording, so the same outage
 * read differently depending on which app you happened to open. Unifying the
 * internal types would mean rewriting the error plumbing in all three for no
 * behaviour change. What is worth unifying is the part a person sees.
 *
 * So this file is the contract: the same nine situations, the same words, in
 * every repository. Each one translates its own error type into a key here.
 */
export type FailureKey =
  | 'offline'
  | 'unreachable'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'server'
  | 'contract'
  | 'unknown';

export type FailureTone = 'warning' | 'error';

export type FailureStatus = {
  /** Short enough for an inline state, and never a stack trace. */
  title: string;
  /** One sentence saying what to expect or do. */
  detail: string;
  tone: FailureTone;
  /**
   * Whether trying again could plausibly work.
   *
   * A 403 and a schema mismatch will not fix themselves, and offering a retry
   * there teaches people that the button does nothing.
   */
  retryable: boolean;
};

const STATUS: Record<FailureKey, FailureStatus> = {
  offline: {
    title: 'No connection',
    detail: 'This device is offline. It will work again once the connection returns.',
    tone: 'warning',
    retryable: true,
  },
  unreachable: {
    title: 'Cannot reach the server',
    detail: 'The connection was refused or dropped. The server may be restarting.',
    tone: 'warning',
    retryable: true,
  },
  timeout: {
    title: 'Took too long',
    detail: 'The server did not answer in time.',
    tone: 'warning',
    retryable: true,
  },
  unauthorized: {
    title: 'Sign in required',
    detail: 'This session has ended. Signing in again restores it.',
    tone: 'warning',
    retryable: false,
  },
  forbidden: {
    title: 'Not permitted',
    detail: 'This account does not have access to this. Retrying will not change that.',
    tone: 'error',
    retryable: false,
  },
  'not-found': {
    title: 'Not found',
    detail: 'This no longer exists, or the address is wrong.',
    tone: 'error',
    retryable: false,
  },
  server: {
    title: 'Server error',
    detail: 'The server failed to answer this. It is not something this page did wrong.',
    tone: 'error',
    retryable: true,
  },
  contract: {
    // Named plainly rather than as "validation", which reads like the reader
    // typed something wrong. They did not: the server sent a shape the client
    // does not accept.
    title: 'Unexpected response',
    detail: 'The server answered in a shape this page cannot read. Retrying is unlikely to help.',
    tone: 'error',
    retryable: false,
  },
  unknown: {
    title: 'Something went wrong',
    detail: 'The cause is not known. Trying again is reasonable.',
    tone: 'error',
    retryable: true,
  },
};

export function failureStatus(key: FailureKey): FailureStatus {
  return STATUS[key];
}

/**
 * Offline is a browser fact rather than a property of the error.
 *
 * A request that fails while the device has no connection is not "the server is
 * down", and telling somebody on a train that the server is unreachable sends
 * them to check a status page for nothing.
 */
function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

/** Translates this repository's `AppFailure` into the shared vocabulary. */
export function failureKeyOf(failure: AppFailure): FailureKey {
  if (failure.origin === 'network') return isOffline() ? 'offline' : 'unreachable';

  switch (failure.kind) {
    case 'timeout':
      return 'timeout';
    case 'auth':
      return failure.status === 403 ? 'forbidden' : 'unauthorized';
    case 'not-found':
      return 'not-found';
    case 'server':
      return 'server';
    case 'validation':
      return 'contract';
    default:
      break;
  }

  if (failure.status === 403) return 'forbidden';
  if (failure.status === 401) return 'unauthorized';
  if (failure.status !== undefined && failure.status >= 500) return 'server';

  return 'unknown';
}

/** The one call a component needs: an unknown thrown value in, a sentence out. */
export function describeFailure(error: unknown): FailureStatus {
  return failureStatus(failureKeyOf(toFailure(error)));
}
