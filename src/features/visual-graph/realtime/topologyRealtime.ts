import type { GraphDocument } from '../model/graph';

export type NodeRuntimeStatus = 'unknown' | 'healthy' | 'warning' | 'critical' | 'offline';
export type EdgeRuntimeStatus = 'unknown' | 'active' | 'degraded' | 'disconnected';
export type TopologyConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';
export type RuntimeMetrics = Readonly<Record<string, number>>;

export type NodeRuntimeState = {
  nodeId: string;
  status: NodeRuntimeStatus;
  metrics: RuntimeMetrics;
  lastUpdated: number;
  sequence: number;
};

export type EdgeRuntimeState = {
  edgeId: string;
  status: EdgeRuntimeStatus;
  metrics: RuntimeMetrics;
  lastUpdated: number;
  sequence: number;
};

type EventBase<TType extends string, TPayload> = {
  eventId: string;
  topologyId: string;
  entityId: string;
  timestamp: number;
  sequence: number;
  type: TType;
  payload: TPayload;
};

export type TopologyRealtimeEvent =
  | EventBase<'NODE_STATUS_CHANGED', { status: NodeRuntimeStatus }>
  | EventBase<'EDGE_STATUS_CHANGED', { status: EdgeRuntimeStatus }>
  | EventBase<'NODE_METRIC_UPDATED', { metrics: RuntimeMetrics }>
  | EventBase<'EDGE_METRIC_UPDATED', { metrics: RuntimeMetrics }>;

export type RuntimeSnapshot = {
  topologyId: string;
  capturedAt: number;
  nodes: readonly NodeRuntimeState[];
  edges: readonly EdgeRuntimeState[];
};

export interface TopologyRuntimeSnapshotService {
  load(topologyId: string): Promise<RuntimeSnapshot>;
}

export interface TopologyRealtimeTransport {
  connect(): Promise<void>;
  disconnect(): void;
  subscribe(listener: (event: TopologyRealtimeEvent) => void): () => void;
  subscribeConnectionState(listener: (state: TopologyConnectionState) => void): () => void;
  getConnectionState(): TopologyConnectionState;
}

export type TopologyRuntimeSummary = Record<NodeRuntimeStatus, number>;

export type RealtimeDebugMetrics = {
  eventsReceived: number;
  eventsApplied: number;
  eventsCoalesced: number;
  duplicateIgnored: number;
  staleIgnored: number;
  unknownEntityIgnored: number;
  flushCount: number;
  averageBatchSize: number;
  bufferSize: number;
  reconnectCount: number;
  lastResyncAt: number | null;
};

export type TopologyRuntimeView = {
  nodes: ReadonlyMap<string, NodeRuntimeState>;
  edges: ReadonlyMap<string, EdgeRuntimeState>;
  summary: TopologyRuntimeSummary;
  debug: RealtimeDebugMetrics;
  metricHistory: ReadonlyMap<string, readonly number[]>;
};

export function createRuntimeSnapshotFromGraph(graph: GraphDocument, topologyId = 'network-topology', capturedAt = Date.now()): RuntimeSnapshot {
  return {
    topologyId,
    capturedAt,
    nodes: graph.nodes.map((node, index) => ({
      nodeId: node.id,
      status: index % 19 === 0 ? 'warning' : 'healthy',
      metrics: { cpu: 30 + (index % 45), memory: 40 + (index % 35) },
      lastUpdated: capturedAt,
      sequence: 0,
    })),
    edges: graph.edges.map((edge) => ({ edgeId: edge.id, status: 'active', metrics: {}, lastUpdated: capturedAt, sequence: 0 })),
  };
}
