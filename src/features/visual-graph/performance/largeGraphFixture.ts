import type { GraphDocument } from '../model/graph';
import type { NetworkEdgeMetadata, NetworkNodeMetadata, NetworkNodeType } from '../network/networkGraph';

export type GraphFixtureSize = 50 | 500 | 2000;

export function createDeterministicGraph(size: GraphFixtureSize): GraphDocument<NetworkNodeType, NetworkNodeMetadata, NetworkEdgeMetadata> {
  const types = ['router', 'firewall', 'server'] as const;
  const nodes = Array.from({ length: size }, (_, index) => ({
    id: `perf-node-${String(index)}`, type: types[index % 3] ?? 'server', label: `Device ${String(index)}`,
    position: { x: (index % 25) * 220, y: Math.floor(index / 25) * 110 },
    metadata: { hostname: `host-${String(index)}`, ipAddress: `10.${String(Math.floor(index / 255))}.${String(index % 255)}.1`, status: index % 17 === 0 ? 'warning' as const : 'healthy' as const, location: `Zone ${String(index % 8)}` },
  }));
  const edges = Array.from({ length: size * 2 - 2 }, (_, index) => {
    const source = index % size; const jump = index < size - 1 ? 1 : 7; const target = (source + jump) % size;
    return { id: `perf-edge-${String(index)}`, sourceNodeId: `perf-node-${String(source)}`, targetNodeId: `perf-node-${String(target)}`, metadata: { protocol: 'TLS', bandwidthMbps: 1000, interface: `eth${String(index % 4)}`, status: 'up' as const } };
  });
  const groups = Array.from({ length: Math.max(1, Math.floor(size / 50)) }, (_, index) => ({ id: `perf-group-${String(index)}`, name: `Group ${String(index)}`, expanded: true, childNodeIds: nodes.slice(index * 10, index * 10 + 10).map((node) => node.id) }));
  return { nodes, edges, groups };
}
