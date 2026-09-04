import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { LoadingState } from '@/components/states/LoadingState';
import { AppShell } from './AppShell';
import { useRouteAnalytics } from '@hooks/useRouteAnalytics';
import { useScrollMemory } from '@hooks/useScrollMemory';
import { routeElements } from './routeRegistry';

export function AppRouter() {
  useRouteAnalytics();
  useScrollMemory();

  return (
    <AppShell>
      <Suspense fallback={<LoadingState label="Loading page" />}>
        <Routes>
          {routeElements.map((route) => (
            <Route element={route.element} key={route.path} path={route.path} />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
