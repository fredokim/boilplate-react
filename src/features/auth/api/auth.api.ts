import { requestDto } from '@core/api/apiClient';
import { markRetried } from '@core/api/refreshSingleFlight';
import { LoginResultDto, SessionDto } from '../dto/Auth.dto';
import type { LoginInput } from '../schemas/login.schema';

export type LoginPayload = LoginInput;

export const authApi = {
  session: () =>
    requestDto(
      {
        method: 'GET',
        url: '/auth/session',
      },
      SessionDto,
    ),
  /**
   * Exchanges the refresh cookie for a new access token.
   *
   * Marked as already-retried before it is sent. That is not a detail: the
   * response interceptor reacts to a 401 by awaiting the in-flight refresh, and
   * this *is* the in-flight refresh — so a 401 here would leave it awaiting its
   * own promise. Opting out makes an expired refresh token surface as a failed
   * refresh instead of a hang.
   */
  refresh: () =>
    requestDto(
      markRetried({
        method: 'POST',
        url: '/auth/refresh',
      }),
      LoginResultDto,
    ),
  login: (data: LoginPayload) =>
    requestDto(
      {
        method: 'POST',
        url: '/auth/login',
        data,
      },
      LoginResultDto,
    ),
};
