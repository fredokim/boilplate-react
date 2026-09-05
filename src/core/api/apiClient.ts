import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import { hasBeenRetried, markRetried, RefreshSingleFlight } from './refreshSingleFlight';
import { ASLEEP_STATUS, serverWakeGate } from './serverWake';
import { createApiEnvelopeDto } from './ApiEnvelope.dto';
import { parseDto } from './validation';
import { analytics } from '@core/analytics/analytics';
import { TypedApiError } from '@core/result/failure';

type TokenProvider = () => string | null;

let tokenProvider: TokenProvider = () => null;

export function setAccessTokenProvider(provider: TokenProvider) {
  tokenProvider = provider;
}

/**
 * Exchanges the refresh cookie for a new access token, or returns null.
 *
 * Registered from the outside for the same reason the token provider is: this
 * module must not import the auth feature, or `core` would depend on
 * `features` and every test touching the api client would drag the auth store
 * in with it.
 *
 * Until something registers one, a 401 is simply a 401 — which is what shipped:
 * `RefreshSingleFlight` existed and was unit-tested, but nothing called it, so
 * every session ended silently when its access token expired.
 */
type TokenRefresher = () => Promise<string | null>;

let refreshRunner: RefreshSingleFlight | null = null;

export function setTokenRefresher(refresher: TokenRefresher | null) {
  refreshRunner = refresher ? new RefreshSingleFlight(refresher) : null;
}

const http = axios.create({
  baseURL: '/api',
  timeout: 10_000,
});

http.interceptors.request.use(async (config) => {
  // Free of charge unless the server is known to be asleep, in which case this
  // waits for the one probe rather than adding another request to a pile the
  // platform is already refusing.
  await serverWakeGate.wait();

  const token = tokenProvider();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.metadata = { startedAt: performance.now() };
  return config;
});

http.interceptors.response.use(
  (response) => {
    const startedAt = response.config.metadata?.startedAt;
    if (typeof startedAt === 'number') {
      analytics.timing(`api:${response.config.url ?? 'unknown'}`, performance.now() - startedAt);
    }
    return response;
  },
  async (error: AxiosError) => {
    const status = error.response?.status;
    const config = error.config;

    /**
     * One retry, and only for a 401 on a request that has not already been
     * retried. The flag is what stops a revoked session from looping: refresh,
     * 401, refresh, forever.
     *
     * The refresh itself is single-flighted. Five requests failing together
     * must not send five refreshes — with a rotating token the four that lose
     * the race present a spent one, which the server reads as a replay and
     * answers by revoking the whole family.
     */
    if (status === 401 && refreshRunner && config && !hasBeenRetried(config)) {
      const token = await refreshRunner.run();

      if (token) {
        markRetried(config);
        config.headers.Authorization = `Bearer ${token}`;
        return http.request(config);
      }
    }

    /**
     * A 429 with no envelope did not come from the API. This app's own 429s --
     * the login throttle and the chat rate limit -- are JSON like every other
     * answer, so a body that is not one means the host refused to wake a
     * sleeping instance.
     */
    const body: unknown = error.response?.data;
    const asleep = status === ASLEEP_STATUS && (typeof body !== 'object' || body === null);

    if (asleep) {
      serverWakeGate.reportAsleep();

      throw new TypedApiError({
        origin: 'network',
        kind: 'waking',
        message: 'The server was idle and is starting.',
        status,
        details: body,
      });
    }

    throw new TypedApiError({
      origin: error.response ? 'backend' : 'network',
      kind: status === 401 ? 'auth' : status === 404 ? 'not-found' : status && status >= 500 ? 'server' : 'unknown',
      message: error.message,
      status,
      details: error.response?.data,
    });
  },
);

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: {
      startedAt: number;
    };
  }
}

export async function requestDto<TData extends object>(
  config: AxiosRequestConfig,
  DataDto: new () => TData,
): Promise<TData> {
  const response = await http.request<unknown>(config);
  const EnvelopeDto = createApiEnvelopeDto(DataDto);
  const envelope = await parseDto(EnvelopeDto, response.data);

  if (!envelope.success || !envelope.data) {
    throw new TypedApiError({
      origin: 'backend',
      kind: envelope.error?.code === 'AUTH_REQUIRED' ? 'auth' : 'unknown',
      message: envelope.error?.message ?? 'Backend returned an unsuccessful response.',
      details: envelope.error,
    });
  }

  return envelope.data;
}
