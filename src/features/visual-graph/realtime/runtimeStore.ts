import type {
  EdgeRuntimeState,
  NodeRuntimeState,
  NodeRuntimeStatus,
  RuntimeStoreSnapshot,
  TopologyRealtimeEvent,
  TopologyRuntimeSnapshot,
} from './types';

export type RuntimeStoreOptions = {
  knownNodeIds: Iterable<string>;
  knownEdgeIds: Iterable<string>;
  processedEventLimit?: number;
  pendingEventLimit?: number;
  metricHistoryLimit?: number;
  monitoredNodeIds?: Iterable<string>;
};

const emptySummary = (): Record<NodeRuntimeStatus, number> => ({
  unknown: 0,
  healthy: 0,
  warning: 0,
  critical: 0,
  offline: 0,
});

const emptyDiagnostics = () => ({
  received: 0,
  applied: 0,
  coalesced: 0,
  duplicatesIgnored: 0,
  staleIgnored: 0,
  unknownEntities: 0,
  dropped: 0,
  flushCount: 0,
  totalBatchSize: 0,
  reconnectCount: 0,
  bufferSize: 0,
  lastResync: null,
});

export class TopologyRuntimeStore {
  private readonly knownNodeIds: Set<string>;
  private readonly knownEdgeIds: Set<string>;
  private readonly processedEventLimit: number;
  private readonly pendingEventLimit: number;
  private readonly metricHistoryLimit: number;
  private readonly monitoredNodeIds: Set<string>;
  private readonly processedEventIds = new Map<string, true>();
  private readonly pending = new Map<string, TopologyRealtimeEvent>();
  private readonly metricHistory = new Map<string, Map<string, number[]>>();
  private listeners = new Set<() => void>();
  private snapshot: RuntimeStoreSnapshot = {
    nodes: {},
    edges: {},
    summary: emptySummary(),
    diagnostics: emptyDiagnostics(),
    version: 0,
  };

  constructor(options: RuntimeStoreOptions) {
    this.knownNodeIds = new Set(options.knownNodeIds);
    this.knownEdgeIds = new Set(options.knownEdgeIds);
    this.processedEventLimit = options.processedEventLimit ?? 5_000;
    this.pendingEventLimit = options.pendingEventLimit ?? 2_000;
    this.metricHistoryLimit = options.metricHistoryLimit ?? 60;
    this.monitoredNodeIds = new Set(options.monitoredNodeIds);
  }

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  setMonitoredNode(nodeId: string | null) {
    this.monitoredNodeIds.clear();
    if (nodeId) this.monitoredNodeIds.add(nodeId);
  }

  enqueue(event: TopologyRealtimeEvent) {
    const diagnostics = { ...this.snapshot.diagnostics, received: this.snapshot.diagnostics.received + 1 };
    if (this.processedEventIds.has(event.eventId)) {
      diagnostics.duplicatesIgnored += 1;
      this.replaceDiagnostics(diagnostics);
      return;
    }
    this.rememberEvent(event.eventId);
    const entityType = event.type.startsWith('NODE') ? 'node' : 'edge';
    const known = entityType === 'node' ? this.knownNodeIds.has(event.entityId) : this.knownEdgeIds.has(event.entityId);
    if (!known) {
      diagnostics.unknownEntities += 1;
      this.replaceDiagnostics(diagnostics);
      return;
    }
    const eventKind = event.type.includes('STATUS') ? 'status' : 'metric';
    const key = `${entityType}:${event.entityId}:${eventKind}`;
    const appliedState = entityType === 'node' ? this.snapshot.nodes[event.entityId] : this.snapshot.edges[event.entityId];
    if (appliedState && appliedState.sequence >= event.sequence) {
      diagnostics.staleIgnored += 1;
      this.replaceDiagnostics(diagnostics);
      return;
    }
    const prior = this.pending.get(key);
    if (prior && prior.sequence >= event.sequence) {
      diagnostics.staleIgnored += 1;
      this.replaceDiagnostics(diagnostics);
      return;
    }
    if (prior) diagnostics.coalesced += 1;
    if (!prior && this.pending.size >= this.pendingEventLimit) {
      const oldest = this.pending.keys().next().value;
      if (oldest) this.pending.delete(oldest);
      diagnostics.dropped += 1;
    }
    this.pending.set(key, event);
    diagnostics.bufferSize = this.pending.size;
    this.replaceDiagnostics(diagnostics);
  }

  flush() {
    if (!this.pending.size) return 0;
    const events = [...this.pending.values()];
    this.pending.clear();
    const nodes = { ...this.snapshot.nodes };
    const edges = { ...this.snapshot.edges };
    const summary = { ...this.snapshot.summary };
    const diagnostics = { ...this.snapshot.diagnostics, bufferSize: 0, flushCount: this.snapshot.diagnostics.flushCount + 1 };
    let applied = 0;

    for (const event of events) {
      const current = event.type.startsWith('NODE') ? nodes[event.entityId] : edges[event.entityId];
      if (current && current.sequence >= event.sequence) {
        diagnostics.staleIgnored += 1;
        continue;
      }
      if (event.type === 'NODE_STATUS_CHANGED' || event.type === 'NODE_METRIC_UPDATED') {
        const previous = nodes[event.entityId];
        const next: NodeRuntimeState = {
          status: event.type === 'NODE_STATUS_CHANGED' ? event.payload.status : previous?.status ?? 'unknown',
          metrics: event.type === 'NODE_METRIC_UPDATED' ? { ...previous?.metrics, ...event.payload.metrics } : previous?.metrics ?? {},
          lastUpdated: event.timestamp,
          sequence: event.sequence,
        };
        nodes[event.entityId] = next;
        if (previous?.status !== next.status) {
          if (previous) summary[previous.status] -= 1;
          summary[next.status] += 1;
        }
        if (event.type === 'NODE_METRIC_UPDATED') this.recordMetrics(event.entityId, event.payload.metrics);
      } else {
        const previous = edges[event.entityId];
        const next: EdgeRuntimeState = {
          status: event.type === 'EDGE_STATUS_CHANGED' ? event.payload.status : previous?.status ?? 'unknown',
          metrics: event.type === 'EDGE_METRIC_UPDATED' ? { ...previous?.metrics, ...event.payload.metrics } : previous?.metrics ?? {},
          lastUpdated: event.timestamp,
          sequence: event.sequence,
        };
        edges[event.entityId] = next;
      }
      applied += 1;
    }
    diagnostics.applied += applied;
    diagnostics.totalBatchSize += events.length;
    this.snapshot = { nodes, edges, summary, diagnostics, version: this.snapshot.version + 1 };
    this.emit();
    return applied;
  }

  applySnapshot(incoming: TopologyRuntimeSnapshot) {
    const nodes = { ...this.snapshot.nodes };
    const edges = { ...this.snapshot.edges };
    for (const [id, state] of Object.entries(incoming.nodes)) {
      if (this.knownNodeIds.has(id) && (!nodes[id] || nodes[id].sequence <= state.sequence)) nodes[id] = state;
    }
    for (const [id, state] of Object.entries(incoming.edges)) {
      if (this.knownEdgeIds.has(id) && (!edges[id] || edges[id].sequence <= state.sequence)) edges[id] = state;
    }
    const summary = emptySummary();
    Object.values(nodes).forEach((node) => (summary[node.status] += 1));
    this.snapshot = {
      nodes,
      edges,
      summary,
      diagnostics: { ...this.snapshot.diagnostics, lastResync: incoming.capturedAt },
      version: this.snapshot.version + 1,
    };
    this.emit();
  }

  markReconnect() {
    this.replaceDiagnostics({ ...this.snapshot.diagnostics, reconnectCount: this.snapshot.diagnostics.reconnectCount + 1 });
  }

  isNodeStale(nodeId: string, now: number, thresholdMs: number) {
    const state = this.snapshot.nodes[nodeId];
    return Boolean(state && now - state.lastUpdated > thresholdMs);
  }

  getMetricHistory(nodeId: string) {
    return Object.fromEntries(this.metricHistory.get(nodeId)?.entries() ?? []);
  }

  getMemoryUsage() {
    return { processedEventIds: this.processedEventIds.size, pendingEvents: this.pending.size, historyNodes: this.metricHistory.size };
  }

  private rememberEvent(eventId: string) {
    this.processedEventIds.set(eventId, true);
    if (this.processedEventIds.size > this.processedEventLimit) {
      const oldest = this.processedEventIds.keys().next().value;
      if (oldest) this.processedEventIds.delete(oldest);
    }
  }

  private recordMetrics(nodeId: string, metrics: Readonly<Record<string, number>>) {
    if (!this.monitoredNodeIds.has(nodeId)) return;
    const byMetric = this.metricHistory.get(nodeId) ?? new Map<string, number[]>();
    for (const [name, value] of Object.entries(metrics)) {
      const values = [...(byMetric.get(name) ?? []), value].slice(-this.metricHistoryLimit);
      byMetric.set(name, values);
    }
    this.metricHistory.set(nodeId, byMetric);
  }

  private replaceDiagnostics(diagnostics: RuntimeStoreSnapshot['diagnostics']) {
    this.snapshot = { ...this.snapshot, diagnostics, version: this.snapshot.version + 1 };
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}
