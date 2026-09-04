import type { GraphRoute } from '../model/graph';

export type GraphRouteRequest = {
  sourceNodeId: string;
  destinationNodeId: string;
};

export type GraphRouteResponse =
  | { status: 'success'; route: GraphRoute }
  | { status: 'no-route'; message?: string };

export interface GraphRouteService {
  findRoute(request: GraphRouteRequest): Promise<GraphRouteResponse>;
}

export type MockGraphRouteServiceOptions = {
  routes: readonly GraphRoute[];
  delayMs?: number;
  errorMessage?: string;
  noRouteMessage?: string;
};

export function createMockGraphRouteService({
  delayMs = 0,
  errorMessage,
  noRouteMessage = 'No route was returned for this source and destination.',
  routes,
}: MockGraphRouteServiceOptions): GraphRouteService {
  return {
    async findRoute(request) {
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      if (errorMessage) throw new Error(errorMessage);

      const route = routes.find(
        (candidate) =>
          candidate.sourceNodeId === request.sourceNodeId && candidate.destinationNodeId === request.destinationNodeId,
      );
      return route ? { status: 'success', route } : { status: 'no-route', message: noRouteMessage };
    },
  };
}
