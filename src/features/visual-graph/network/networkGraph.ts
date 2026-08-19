import type { GraphDocument, GraphNodePresentationResolver } from '../model/graph';

export type NetworkNodeType = 'router' | 'firewall' | 'server';

export type NetworkNodeMetadata = {
  hostname: string;
  ipAddress: string;
  location: string;
};

export type NetworkEdgeMetadata = {
  protocol: string;
  bandwidthMbps: number;
};

export const networkGraph: GraphDocument<NetworkNodeType, NetworkNodeMetadata, NetworkEdgeMetadata> = {
  nodes: [
    {
      id: 'core-router',
      type: 'router',
      label: 'Core Router',
      position: { x: 40, y: 150 },
      metadata: { hostname: 'rt-core-01', ipAddress: '10.0.0.1', location: 'Seoul DC' },
    },
    {
      id: 'edge-firewall',
      type: 'firewall',
      label: 'Edge Firewall',
      position: { x: 330, y: 150 },
      metadata: { hostname: 'fw-edge-01', ipAddress: '10.0.1.1', location: 'Seoul DC' },
    },
    {
      id: 'api-server',
      type: 'server',
      label: 'API Server',
      position: { x: 650, y: 40 },
      metadata: { hostname: 'api-prod-01', ipAddress: '10.0.2.21', location: 'Zone A' },
    },
    {
      id: 'worker-server',
      type: 'server',
      label: 'Worker Server',
      position: { x: 650, y: 270 },
      metadata: { hostname: 'worker-prod-01', ipAddress: '10.0.2.31', location: 'Zone B' },
    },
  ],
  edges: [
    {
      id: 'router-to-firewall',
      sourceNodeId: 'core-router',
      targetNodeId: 'edge-firewall',
      label: 'uplink',
      metadata: { protocol: 'BGP', bandwidthMbps: 10000 },
    },
    {
      id: 'firewall-to-api',
      sourceNodeId: 'edge-firewall',
      targetNodeId: 'api-server',
      metadata: { protocol: 'HTTPS', bandwidthMbps: 1000 },
    },
    {
      id: 'firewall-to-worker',
      sourceNodeId: 'edge-firewall',
      targetNodeId: 'worker-server',
      metadata: { protocol: 'TLS', bandwidthMbps: 1000 },
    },
  ],
  route: {
    routeNodeIds: ['core-router', 'edge-firewall', 'api-server'],
    routeEdgeIds: ['router-to-firewall', 'firewall-to-api'],
  },
};

export const getNetworkNodePresentation: GraphNodePresentationResolver<NetworkNodeType> = (type) => {
  const presentations = {
    router: { color: '#2563eb', icon: 'R', typeLabel: 'Router' },
    firewall: { color: '#dc2626', icon: 'F', typeLabel: 'Firewall' },
    server: { color: '#059669', icon: 'S', typeLabel: 'Server' },
  } as const;

  return presentations[type];
};

