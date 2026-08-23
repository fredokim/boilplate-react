import type { GraphDocument } from '../model/graph';
import {
  createRuntimeSnapshotFromGraph,
  type EdgeRuntimeState,
  type NodeRuntimeState,
  type RuntimeSnapshot,
  type TopologyConnectionState,
  type TopologyRealtimeEvent,
  type TopologyRealtimeTransport,
  type TopologyRuntimeSnapshotService,
} from './topologyRealtime';

export type MockRealtimeOptions = {
  topologyId?: string;
  eventsPerSecond?: 0 | 1 | 10 | 100 | 500 | 1000;
  disconnectAfterMs?: number;
  initialEvents?: readonly TopologyRealtimeEvent[];
};

export class MockTopologyRealtimeServer implements TopologyRealtimeTransport, TopologyRuntimeSnapshotService {
  private state: TopologyConnectionState = 'disconnected';
  private readonly eventListeners = new Set<(event: TopologyRealtimeEvent) => void>();
  private readonly stateListeners = new Set<(state: TopologyConnectionState) => void>();
  private readonly nodeIds: readonly string[];
  private readonly edgeIds: readonly string[];
  private nodeState = new Map<string, NodeRuntimeState>();
  private edgeState = new Map<string, EdgeRuntimeState>();
  private sequence = new Map<string, number>();
  private interval: ReturnType<typeof setInterval> | null = null;
  private disconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private eventCounter = 0;
  private tickCounter = 0;
  private readonly topologyId: string;
  private readonly eventsPerSecond: number;

  constructor(graph: GraphDocument, private readonly options: MockRealtimeOptions = {}) {
    this.topologyId = options.topologyId ?? 'network-topology';
    this.eventsPerSecond = options.eventsPerSecond ?? 1;
    this.nodeIds = graph.nodes.map((node) => node.id);
    this.edgeIds = graph.edges.map((edge) => edge.id);
    const initial = createRuntimeSnapshotFromGraph(graph, this.topologyId);
    this.nodeState = new Map(initial.nodes.map((state) => [state.nodeId, state]));
    this.edgeState = new Map(initial.edges.map((state) => [state.edgeId, state]));
  }

  async connect() {
    this.setState(this.state === 'disconnected' ? 'connecting' : 'reconnecting');
    await Promise.resolve();
    this.setState('connected');
    this.startEvents();
    for (const event of this.options.initialEvents ?? []) this.emit(event);
    if (this.options.disconnectAfterMs && !this.disconnectTimer) {
      this.disconnectTimer = setTimeout(() => this.simulateNetworkDisconnect(), this.options.disconnectAfterMs);
    }
  }

  disconnect() {
    this.stopEvents();
    if (this.disconnectTimer) clearTimeout(this.disconnectTimer);
    this.disconnectTimer = null;
    this.setState('disconnected');
  }

  simulateNetworkDisconnect() {
    this.stopEvents();
    this.setState('disconnected');
  }

  subscribe(listener: (event: TopologyRealtimeEvent) => void) { this.eventListeners.add(listener); return () => this.eventListeners.delete(listener); }
  subscribeConnectionState(listener: (state: TopologyConnectionState) => void) { this.stateListeners.add(listener); return () => this.stateListeners.delete(listener); }
  getConnectionState() { return this.state; }

  async load(topologyId: string): Promise<RuntimeSnapshot> {
    if (topologyId !== this.topologyId) throw new Error(`Unknown topology: ${topologyId}`);
    return { topologyId, capturedAt: Date.now(), nodes: [...this.nodeState.values()], edges: [...this.edgeState.values()] };
  }

  emit(event: TopologyRealtimeEvent) {
    this.applyServerState(event);
    if (this.state === 'connected') for (const listener of this.eventListeners) listener(event);
  }

  private startEvents() {
    this.stopEvents();
    if (!this.eventsPerSecond) return;
    this.interval = setInterval(() => {
      this.tickCounter += 1;
      const count = Math.floor((this.eventsPerSecond * this.tickCounter) / 10) - Math.floor((this.eventsPerSecond * (this.tickCounter - 1)) / 10);
      for (let index = 0; index < count; index += 1) this.emit(this.createMetricEvent());
    }, 100);
  }

  private stopEvents() { if (this.interval) clearInterval(this.interval); this.interval = null; }

  private createMetricEvent(): TopologyRealtimeEvent {
    this.eventCounter += 1;
    const useNode = this.eventCounter % 4 !== 0 || !this.edgeIds.length;
    const ids = useNode ? this.nodeIds : this.edgeIds;
    const entityId = ids[this.eventCounter % ids.length] ?? 'unknown';
    const sequence = (this.sequence.get(entityId) ?? 0) + 1;
    this.sequence.set(entityId, sequence);
    return useNode
      ? { eventId: `mock-${String(this.eventCounter)}`, topologyId: this.topologyId, entityId, timestamp: Date.now(), sequence, type: 'NODE_METRIC_UPDATED', payload: { metrics: { cpu: 20 + (this.eventCounter % 78), memory: 30 + (this.eventCounter % 65) } } }
      : { eventId: `mock-${String(this.eventCounter)}`, topologyId: this.topologyId, entityId, timestamp: Date.now(), sequence, type: 'EDGE_METRIC_UPDATED', payload: { metrics: { latency: 5 + (this.eventCounter % 80), throughput: 100 + (this.eventCounter % 900) } } };
  }

  private applyServerState(event: TopologyRealtimeEvent) {
    if (event.type === 'NODE_STATUS_CHANGED' || event.type === 'NODE_METRIC_UPDATED') {
      const current = this.nodeState.get(event.entityId);
      if (!current || event.sequence <= current.sequence) return;
      this.nodeState.set(event.entityId, { nodeId: event.entityId, status: event.type === 'NODE_STATUS_CHANGED' ? event.payload.status : current.status, metrics: event.type === 'NODE_METRIC_UPDATED' ? { ...current.metrics, ...event.payload.metrics } : current.metrics, lastUpdated: event.timestamp, sequence: event.sequence });
    } else {
      const current = this.edgeState.get(event.entityId);
      if (!current || event.sequence <= current.sequence) return;
      this.edgeState.set(event.entityId, { edgeId: event.entityId, status: event.type === 'EDGE_STATUS_CHANGED' ? event.payload.status : current.status, metrics: event.type === 'EDGE_METRIC_UPDATED' ? { ...current.metrics, ...event.payload.metrics } : current.metrics, lastUpdated: event.timestamp, sequence: event.sequence });
    }
  }

  private setState(state: TopologyConnectionState) { this.state = state; for (const listener of this.stateListeners) listener(state); }
}
