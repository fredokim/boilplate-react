import type { GraphDocument } from '../model/graph';
import type { NetworkEdgeMetadata, NetworkNodeMetadata, NetworkNodeType } from './networkGraph';

const nodeTypes: readonly NetworkNodeType[] = ['router', 'firewall', 'server'];
const nodeTypeLabels: Record<NetworkNodeType, string> = { router: 'Router', firewall: 'Firewall', server: 'Server' };

export const largeNetworkGraph: GraphDocument<NetworkNodeType, NetworkNodeMetadata, NetworkEdgeMetadata> = {
  nodes: Array.from({ length: 24 }, (_, index) => {
    const column = index % 6;
    const row = Math.floor(index / 6);
    const type = nodeTypes[index % nodeTypes.length] ?? 'server';
    const nodeNumber = String(index + 1);
    return {
      id: `node-${nodeNumber}`,
      type,
      label: `${nodeTypeLabels[type]} ${nodeNumber}`,
      position: { x: column * 250, y: row * 150 },
      metadata: {
        hostname: `${type}-${String(index + 1).padStart(2, '0')}`,
        ipAddress: `10.${String(row)}.${String(column)}.${String(index + 10)}`,
        status: index % 7 === 0 ? 'warning' : 'healthy',
        location: `Zone ${String.fromCharCode(65 + row)}`,
      },
    };
  }),
  edges: Array.from({ length: 23 }, (_, index) => {
    const label = index % 4 === 0 ? { label: 'backbone' } : {};
    const sourceNumber = String(index + 1);
    const targetNumber = String(index + 2);
    return {
      id: `edge-${sourceNumber}-${targetNumber}`,
      sourceNodeId: `node-${sourceNumber}`,
      targetNodeId: `node-${targetNumber}`,
      ...label,
      metadata: {
        protocol: index % 3 === 0 ? 'BGP' : 'TLS',
        bandwidthMbps: index % 4 === 0 ? 10000 : 1000,
        interface: `eth${String(index % 4)}`,
        status: index % 9 === 0 ? 'degraded' : 'up',
      },
    };
  }),
};

export const largeNetworkRoute = {
  id: 'route-large-1-to-12',
  sourceNodeId: 'node-1',
  destinationNodeId: 'node-12',
  nodeIds: Array.from({ length: 12 }, (_, index) => `node-${String(index + 1)}`),
  edgeIds: Array.from(
    { length: 11 },
    (_, index) => `edge-${String(index + 1)}-${String(index + 2)}`,
  ),
  metadata: { fixture: 'large-topology' },
} as const;
