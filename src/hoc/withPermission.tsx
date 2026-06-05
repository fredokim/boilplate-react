import { ErrorState } from '@/components/states/ErrorState';
import { useAuthStore } from '@stores/auth.store';
import type { ComponentType } from 'react';

export function withPermission<P extends object>(permission: string, Component: ComponentType<P>) {
  return function PermissionGuardedComponent(props: P) {
    const hasPermission = useAuthStore((state) => state.hasPermission(permission));

    if (!hasPermission) {
      return (
        <ErrorState
          failure={{
            origin: 'frontend',
            kind: 'auth',
            message: `Missing permission: ${permission}`,
          }}
          title="Permission required"
        />
      );
    }

    return <Component {...props} />;
  };
}
