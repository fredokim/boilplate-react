import { create } from 'zustand';
import { setAccessTokenProvider } from '@core/api/apiClient';
import { tokenStorage } from '@core/auth/tokenStorage';
import { fallbackState, parseState } from '@core/state/validateState';
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
