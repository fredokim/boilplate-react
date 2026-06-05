import { requestDto } from '@core/api/apiClient';
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
