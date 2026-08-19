import { MockTopologyTransport } from '../realtime/mockTransport';
import type { NodeRuntimeState, NodeRuntimeStatus, TopologyRealtimeEvent, TopologyRuntimeSnapshot } from '../realtime/types';

export const networkTopologyId = 'seoul-production';
export const networkRealtimeTransport = new MockTopologyTransport();

let revision = 1;
const runtimeNodes: Record<string, NodeRuntimeState> = {
  'core-router': { status: 'healthy', metrics: { cpu: 32, memory: 48 }, lastUpdated: Date.now(), sequence: 1 },
  'edge-firewall': { status: 'healthy', metrics: { cpu: 52, memory: 63 }, lastUpdated: Date.now(), sequence: 1 },
  'api-server': { status: 'healthy', metrics: { cpu: 44, memory: 58 }, lastUpdated: Date.now(), sequence: 1 },
  'worker-server': { status: 'warning', metrics: { cpu: 82, memory: 71 }, lastUpdated: Date.now(), sequence: 1 },
};
const runtimeEdges: TopologyRuntimeSnapshot['edges'] = {
  'router-to-firewall': { status: 'active', metrics: { latency: 4, throughput: 8600 }, lastUpdated: Date.now(), sequence: 1 },
  'firewall-to-api': { status: 'active', metrics: { latency: 12, throughput: 730 }, lastUpdated: Date.now(), sequence: 1 },
  'firewall-to-worker': { status: 'degraded', metrics: { latency: 45, packetLoss: 2.3 }, lastUpdated: Date.now(), sequence: 1 },
};

export async function loadNetworkRuntimeSnapshot(): Promise<TopologyRuntimeSnapshot> {
  await Promise.resolve();
  return { topologyId: networkTopologyId, revision, capturedAt: Date.now(), nodes: runtimeNodes, edges: runtimeEdges };
}

export function createNetworkEvent(index: number): TopologyRealtimeEvent {
  const ids = Object.keys(runtimeNodes);
  const entityId = ids[index % ids.length] ?? 'core-router';
  const sequence = ++revision;
  const timestamp = Date.now();
  const current = runtimeNodes[entityId] ?? { status: 'unknown', metrics: {}, lastUpdated: timestamp, sequence: 0 };
  if (index % 3 === 0) {
    const statuses: NodeRuntimeStatus[] = ['healthy', 'warning', 'critical', 'offline'];
    const status = statuses[Math.floor(index / 3) % statuses.length] ?? 'unknown';
    const event = { eventId: `status-${String(sequence)}`, topologyId: networkTopologyId, entityId, timestamp, sequence, type: 'NODE_STATUS_CHANGED' as const, payload: { status } };
    runtimeNodes[entityId] = { ...current, status, lastUpdated: timestamp, sequence };
    return event;
  }
  const metrics = { cpu: 30 + ((index * 17) % 68), memory: 40 + ((index * 11) % 55) };
  const event = { eventId: `metric-${String(sequence)}`, topologyId: networkTopologyId, entityId, timestamp, sequence, type: 'NODE_METRIC_UPDATED' as const, payload: { metrics } };
  runtimeNodes[entityId] = { ...current, metrics, lastUpdated: timestamp, sequence };
  return event;
}
