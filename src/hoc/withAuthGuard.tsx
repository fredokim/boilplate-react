import { useAuthSession } from '@features/auth/hooks/useAuthSession';
import { useAuthStore } from '@stores/auth.store';
import type { ComponentType } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoadingState } from '@/components/states/LoadingState';

export function withAuthGuard<P extends object>(Component: ComponentType<P>) {
  return function AuthGuardedComponent(props: P) {
    const location = useLocation();
    const status = useAuthStore((state) => state.status);
    const accessToken = useAuthStore((state) => state.accessToken);
    const session = useAuthSession();

    if (!accessToken && status === 'anonymous') {
      return <Navigate replace state={{ from: location.pathname }} to="/login" />;
    }

    if (status === 'checking' || session.isLoading) {
      return <LoadingState label="Checking session" />;
    }

    return <Component {...props} />;
  };
}
