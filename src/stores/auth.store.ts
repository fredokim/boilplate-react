import { create } from 'zustand';
import { setAccessTokenProvider, setTokenRefresher } from '@core/api/apiClient';
import { tokenStorage } from '@core/auth/tokenStorage';
import { fallbackState, parseState } from '@core/state/validateState';
import { authApi } from '@features/auth/api/auth.api';
import type { AuthUserDto } from '@features/auth/dto/Auth.dto';
import { authStateSnapshotSchema, authUserStateSchema, type AuthStatus } from './auth.schema';

const initialAuthSnapshot = fallbackState(
  authStateSnapshotSchema,
  {
    accessToken: tokenStorage.getAccessToken(),
    status: tokenStorage.getAccessToken() ? 'checking' : 'anonymous',
    user: null,
  },
  {
    accessToken: null,
    status: 'anonymous',
    user: null,
  },
  'auth.initial',
);

type AuthState = {
  accessToken: string | null;
  status: AuthStatus;
  user: AuthUserDto | null;
  setSession: (user: AuthUserDto, accessToken?: string) => void;
  setChecking: () => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: initialAuthSnapshot.accessToken,
  status: initialAuthSnapshot.status,
  user: initialAuthSnapshot.user,
  setSession: (user, accessToken) => {
    const validatedUser = parseState(authUserStateSchema, user, 'auth.user');
    const nextSnapshot = parseState(
      authStateSnapshotSchema,
      {
        accessToken: accessToken ?? get().accessToken,
        status: 'authenticated',
        user: validatedUser,
      },
      'auth.setSession',
    );

    if (accessToken) {
      tokenStorage.setAccessToken(accessToken);
    }
    set(nextSnapshot);
  },
  setChecking: () => set({ status: 'checking' }),
  logout: () => {
    tokenStorage.clear();
    set(parseState(authStateSnapshotSchema, { accessToken: null, status: 'anonymous', user: null }, 'auth.logout'));
  },
  hasPermission: (permission) => get().user?.permissions.includes(permission) ?? false,
}));

setAccessTokenProvider(() => useAuthStore.getState().accessToken);

/**
 * Lets an expired access token recover instead of ending the session.
 *
 * A failed refresh logs out rather than leaving the store holding a token the
 * server has stopped honouring — a state where the UI looks signed in and every
 * request 401s.
 */
setTokenRefresher(async () => {
  try {
    const result = await authApi.refresh();
    useAuthStore.getState().setSession(result.user, result.accessToken);
    return result.accessToken;
  } catch {
    useAuthStore.getState().logout();
    return null;
  }
});
