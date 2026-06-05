import { useQuery } from '@tanstack/react-query';
import { userApi } from '../api/user.api';

export function useUserQuery(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => userApi.detail(id),
    enabled: Boolean(id),
  });
}

export function useUserListQuery() {
  return useQuery({
    queryKey: ['users'],
    queryFn: userApi.list,
  });
}
