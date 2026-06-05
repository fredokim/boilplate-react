import { withAuthGuard } from "@hoc/withAuthGuard";
import { withPermission } from "@hoc/withPermission";
import type { ComponentType } from "react";
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

export function createRouteElement(route: AppRouteConfig) {
  const LazyRoute = lazy(route.loader);
  const AuthGuardedRoute = route.auth === false ? LazyRoute : withAuthGuard(LazyRoute);
  const GuardedRoute = route.permission ? withPermission(route.permission, AuthGuardedRoute) : AuthGuardedRoute;

  return <GuardedRoute />;
}
