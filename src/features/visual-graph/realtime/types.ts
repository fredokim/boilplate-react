export type NodeRuntimeStatus = 'unknown' | 'healthy' | 'warning' | 'critical' | 'offline';
export type EdgeRuntimeStatus = 'unknown' | 'active' | 'degraded' | 'disconnected';
export type RuntimeMetrics = Readonly<Record<string, number>>;

export type EntityRuntimeState<TStatus extends string> = {
  status: TStatus;
  metrics: RuntimeMetrics;
  lastUpdated: number;
  sequence: number;
};

export type NodeRuntimeState = EntityRuntimeState<NodeRuntimeStatus>;
export type EdgeRuntimeState = EntityRuntimeState<EdgeRuntimeStatus>;

type EventBase = {
  eventId: string;
  topologyId: string;
  entityId: string;
  timestamp: number;
  sequence: number;
};

export type TopologyRealtimeEvent =
  | (EventBase & { type: 'NODE_STATUS_CHANGED'; payload: { status: NodeRuntimeStatus } })
  | (EventBase & { type: 'EDGE_STATUS_CHANGED'; payload: { status: EdgeRuntimeStatus } })
  | (EventBase & { type: 'NODE_METRIC_UPDATED'; payload: { metrics: RuntimeMetrics } })
  | (EventBase & { type: 'EDGE_METRIC_UPDATED'; payload: { metrics: RuntimeMetrics } });

export type TopologyRuntimeSnapshot = {
  topologyId: string;
  revision: number;
  capturedAt: number;
  nodes: Readonly<Record<string, NodeRuntimeState>>;
  edges: Readonly<Record<string, EdgeRuntimeState>>;
};

export type RealtimeConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

export type RealtimeDiagnostics = {
  received: number;
  applied: number;
  coalesced: number;
  duplicatesIgnored: number;
  staleIgnored: number;
  unknownEntities: number;
  dropped: number;
  flushCount: number;
  totalBatchSize: number;
  reconnectCount: number;
  bufferSize: number;
  lastResync: number | null;
};

export type RuntimeSummary = Record<NodeRuntimeStatus, number>;

export type RuntimeStoreSnapshot = {
  nodes: Readonly<Record<string, NodeRuntimeState>>;
  edges: Readonly<Record<string, EdgeRuntimeState>>;
  summary: RuntimeSummary;
  diagnostics: RealtimeDiagnostics;
  version: number;
};

export type RuntimeSnapshotProvider = (topologyId: string) => Promise<TopologyRuntimeSnapshot>;
