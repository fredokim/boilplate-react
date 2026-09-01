import { withAuthGuard } from "@hoc/withAuthGuard";
import { withPermission } from "@hoc/withPermission";
import type { ComponentType, ReactElement } from "react";
import { lazy } from "react";

export type AppRouteConfig = {
  path: string;
  title: string;
  loader: () => Promise<{ default: ComponentType<object> }>;
  auth?: boolean;
  permission?: string;
  nav?: boolean;
};

const generatedModules = import.meta.glob<{ default: AppRouteConfig }>("@features/**/routes/*.route.tsx", {
  eager: true,
});

const baseRoutes = [
  {
    path: "/",
    title: "Dashboard",
    auth: true,
    nav: true,
    loader: () => import("@features/dashboard/containers/DashboardContainer"),
  },
  {
    path: "/login",
    title: "Login",
    auth: false,
    nav: false,
    loader: () => import("@features/auth/containers/LoginContainer"),
  },
  {
    path: "/users/:id",
    title: "Profile",
    auth: true,
    nav: false,
    loader: () => import("@features/user/containers/UserContainer"),
  },
] satisfies AppRouteConfig[];

export const appRoutes = [...baseRoutes, ...Object.values(generatedModules).map((module) => module.default)];
export const navRoutes = appRoutes.filter((route) => route.nav);

/**
 * Builds one route element per route, once, at module scope.
 *
 * `lazy()` and the guard HOCs each produce a new component *type* on every call.
 * Calling them while rendering therefore hands React a different type for the
 * same route on every pass: it unmounts the previous subtree, mounts a fresh
 * lazy component, and that one suspends again. On a path that re-renders the
 * router — an auth redirect, for instance — the cycle never settles and the page
 * stays blank with no error in the console.
 *
 * Route configuration is static, so the elements are built here and reused. This
 * is not an optimisation; rebuilding them per render is incorrect.
 */
export const routeElements: readonly { path: string; element: ReactElement }[] = appRoutes.map((route) => ({
  path: route.path,
  element: createRouteElement(route),
}));

function createRouteElement(route: AppRouteConfig) {
  const LazyRoute = lazy(route.loader);
  const AuthGuardedRoute = route.auth === false ? LazyRoute : withAuthGuard(LazyRoute);
  const GuardedRoute = route.permission ? withPermission(route.permission, AuthGuardedRoute) : AuthGuardedRoute;

  return <GuardedRoute />;
}
