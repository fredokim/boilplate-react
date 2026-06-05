import { requestDto } from '@core/api/apiClient';
import { UserDto, UserListDto } from '../dto/User.dto';

export const userApi = {
  detail: (id: string) =>
    requestDto(
      {
        method: 'GET',
        url: `/users/${id}`,
      },
      UserDto,
    ),
  list: () =>
    requestDto(
      {
        method: 'GET',
        url: '/users',
      },
      UserListDto,
    ),
};
