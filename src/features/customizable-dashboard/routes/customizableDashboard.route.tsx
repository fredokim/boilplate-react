import type { AppRouteConfig } from '@app/router/routeRegistry';

export default {
  path: '/examples/dashboard',
  title: 'Custom Dashboard',
  auth: false,
  nav: true,
  loader: () => import('../containers/CustomizableDashboardContainer'),
} satisfies AppRouteConfig;

