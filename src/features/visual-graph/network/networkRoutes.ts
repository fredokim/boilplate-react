import type { GraphRoute } from '../model/graph';
import { createMockGraphRouteService } from '../services/graphRouteService';

export const coreToApiRoute: GraphRoute = {
    id: 'route-core-to-api',
    sourceNodeId: 'core-router',
    destinationNodeId: 'api-server',
    nodeIds: ['core-router', 'edge-firewall', 'api-server'],
    edgeIds: ['router-to-firewall', 'firewall-to-api'],
    metadata: { calculatedBy: 'mock-network-engine', latencyMs: 18 },
};

export const coreToWorkerRoute: GraphRoute = {
    id: 'route-core-to-worker',
    sourceNodeId: 'core-router',
    destinationNodeId: 'worker-server',
    nodeIds: ['core-router', 'edge-firewall', 'worker-server'],
    edgeIds: ['router-to-firewall', 'firewall-to-worker'],
    metadata: { calculatedBy: 'mock-network-engine', latencyMs: 24 },
};

export const networkRoutes: readonly GraphRoute[] = [coreToApiRoute, coreToWorkerRoute];

export const networkRouteService = createMockGraphRouteService({ routes: networkRoutes, delayMs: 250 });
