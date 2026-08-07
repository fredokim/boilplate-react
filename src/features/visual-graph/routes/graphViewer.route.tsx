import type { AppRouteConfig } from '@app/router/routeRegistry';

export default {
  path: '/examples/graph',
  title: 'Graph Viewer',
  auth: false,
  nav: true,
  loader: () => import('../containers/GraphViewerContainer'),
} satisfies AppRouteConfig;

