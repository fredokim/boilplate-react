import type { AppRouteConfig } from '@app/router/routeRegistry';

export default {
  path: '/examples/live',
  title: 'Live Lab',
  auth: false,
  nav: true,
  loader: () => import('../containers/LiveExperienceContainer'),
} satisfies AppRouteConfig;

