import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import { createApiEnvelopeDto } from './ApiEnvelope.dto';
import { parseDto } from './validation';
import { analytics } from '@core/analytics/analytics';
import { TypedApiError } from '@core/result/failure';

type TokenProvider = () => string | null;

let tokenProvider: TokenProvider = () => null;

export function setAccessTokenProvider(provider: TokenProvider) {
  tokenProvider = provider;
}

const http = axios.create({
  baseURL: '/api',
  timeout: 10_000,
});

http.interceptors.request.use((config) => {
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
  (error: AxiosError) => {
    const status = error.response?.status;
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
