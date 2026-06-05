import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@stores/auth.store';
import { authApi, type LoginPayload } from '../api/auth.api';

export function useAuthSession() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const setSession = useAuthStore((state) => state.setSession);
  const logout = useAuthStore((state) => state.logout);

  return useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      const session = await authApi.session();
      setSession(session.user);
      return session;
    },
    enabled: Boolean(accessToken),
    retry: false,
    throwOnError: false,
    meta: {
      onError: logout,
    },
  });
}

export function useLoginMutation() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (result) => setSession(result.user, result.accessToken),
  });
}
