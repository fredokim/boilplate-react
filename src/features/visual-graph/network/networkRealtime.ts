import { createGraphRuntimeSource } from '../realtime/graphRuntimeSource';
import { networkGraph } from './networkGraph';

export const networkTopologyId = 'seoul-production';

/**
 * Curated starting state for the demo topology so the first paint shows a mixed
 * health picture instead of an all-green graph.
 */
export const networkRuntimeSource = createGraphRuntimeSource(networkGraph, {
  topologyId: networkTopologyId,
  eventsPerSecond: 10,
  initialNodeStatus: {
    'core-router': 'healthy',
    'edge-firewall': 'healthy',
    'api-server': 'healthy',
    'worker-server': 'warning',
  },
  initialEdgeStatus: {
    'router-to-firewall': 'active',
    'firewall-to-api': 'active',
    'firewall-to-worker': 'degraded',
  },
});

export const networkRealtimeTransport = networkRuntimeSource.transport;
export const loadNetworkRuntimeSnapshot = networkRuntimeSource.loadSnapshot;
export const createNetworkEvent = networkRuntimeSource.createEvent;
