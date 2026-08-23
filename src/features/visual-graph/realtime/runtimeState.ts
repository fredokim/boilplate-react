import type { GraphDocument } from '../model/graph';
import type {
  EdgeRuntimeState, NodeRuntimeState, RealtimeDebugMetrics, RuntimeSnapshot,
  TopologyRealtimeEvent, TopologyRuntimeSummary, TopologyRuntimeView,
} from './topologyRealtime';

export const PROCESSED_EVENT_CACHE_LIMIT = 2_048;
export const METRIC_HISTORY_LIMIT = 60;

const emptySummary = (): TopologyRuntimeSummary => ({ unknown: 0, healthy: 0, warning: 0, critical: 0, offline: 0 });
const emptyDebug = (): RealtimeDebugMetrics => ({
  eventsReceived: 0, eventsApplied: 0, eventsCoalesced: 0, duplicateIgnored: 0, staleIgnored: 0,
  unknownEntityIgnored: 0, flushCount: 0, averageBatchSize: 0, bufferSize: 0, reconnectCount: 0, lastResyncAt: null,
});

export class TopologyRuntimeEngine {
  private readonly nodeIds: ReadonlySet<string>;
  private readonly edgeIds: ReadonlySet<string>;
  private nodes = new Map<string, NodeRuntimeState>();
  private edges = new Map<string, EdgeRuntimeState>();
  private summary = emptySummary();
  private debug = emptyDebug();
  private processedIds = new Set<string>();
  private processedOrder: string[] = [];
  private monitoredNodeId: string | null = null;
  private metricHistory = new Map<string, readonly number[]>();

  constructor(graph: GraphDocument, private readonly processedEventLimit = PROCESSED_EVENT_CACHE_LIMIT) {
    this.nodeIds = new Set(graph.nodes.map((node) => node.id));
    this.edgeIds = new Set(graph.edges.map((edge) => edge.id));
  }

  setMonitoredNode(nodeId: string | null) {
    if (this.monitoredNodeId === nodeId) return;
    this.monitoredNodeId = nodeId;
    this.metricHistory = new Map();
  }

  noteReceived(count: number) { this.debug = { ...this.debug, eventsReceived: this.debug.eventsReceived + count }; }
  noteCoalesced(count: number) { this.debug = { ...this.debug, eventsCoalesced: this.debug.eventsCoalesced + count }; }
  noteDuplicate(count: number) { this.debug = { ...this.debug, duplicateIgnored: this.debug.duplicateIgnored + count }; }
  setBufferSize(bufferSize: number) { this.debug = { ...this.debug, bufferSize }; }
  noteReconnect() { this.debug = { ...this.debug, reconnectCount: this.debug.reconnectCount + 1 }; }

  applySnapshot(snapshot: RuntimeSnapshot): TopologyRuntimeView {
    this.nodes = new Map(this.nodes);
    this.edges = new Map(this.edges);
    for (const next of snapshot.nodes) {
      if (!this.nodeIds.has(next.nodeId)) continue;
      const current = this.nodes.get(next.nodeId);
      if (current && current.sequence >= next.sequence) continue;
      this.setNode(next);
    }
    for (const next of snapshot.edges) {
      if (!this.edgeIds.has(next.edgeId)) continue;
      const current = this.edges.get(next.edgeId);
      if (current && current.sequence >= next.sequence) continue;
      this.edges.set(next.edgeId, next);
    }
    this.debug = { ...this.debug, lastResyncAt: snapshot.capturedAt };
    return this.view();
  }

  applyBatch(events: readonly TopologyRealtimeEvent[]): TopologyRuntimeView {
    this.nodes = new Map(this.nodes);
    this.edges = new Map(this.edges);
    let applied = 0;
    for (const event of events) {
      if (this.processedIds.has(event.eventId)) { this.debug.duplicateIgnored += 1; continue; }
      this.rememberEvent(event.eventId);
      const targetExists = event.type.startsWith('NODE_') ? this.nodeIds.has(event.entityId) : this.edgeIds.has(event.entityId);
      if (!targetExists) { this.debug.unknownEntityIgnored += 1; continue; }
      const currentSequence = event.type.startsWith('NODE_') ? this.nodes.get(event.entityId)?.sequence : this.edges.get(event.entityId)?.sequence;
      if (currentSequence !== undefined && event.sequence <= currentSequence) { this.debug.staleIgnored += 1; continue; }
      if (event.type === 'NODE_STATUS_CHANGED' || event.type === 'NODE_METRIC_UPDATED') {
        const current = this.nodes.get(event.entityId);
        this.setNode({
          nodeId: event.entityId,
          status: event.type === 'NODE_STATUS_CHANGED' ? event.payload.status : (current?.status ?? 'unknown'),
          metrics: event.type === 'NODE_METRIC_UPDATED' ? { ...current?.metrics, ...event.payload.metrics } : (current?.metrics ?? {}),
          lastUpdated: event.timestamp,
          sequence: event.sequence,
        });
        if (event.type === 'NODE_METRIC_UPDATED' && event.entityId === this.monitoredNodeId) this.recordMetrics(event.payload.metrics);
      } else {
        const current = this.edges.get(event.entityId);
        this.edges.set(event.entityId, {
          edgeId: event.entityId,
          status: event.type === 'EDGE_STATUS_CHANGED' ? event.payload.status : (current?.status ?? 'unknown'),
          metrics: event.type === 'EDGE_METRIC_UPDATED' ? { ...current?.metrics, ...event.payload.metrics } : (current?.metrics ?? {}),
          lastUpdated: event.timestamp,
          sequence: event.sequence,
        });
      }
      applied += 1;
    }
    const flushCount = this.debug.flushCount + 1;
    const eventsApplied = this.debug.eventsApplied + applied;
    this.debug = { ...this.debug, eventsApplied, flushCount, averageBatchSize: eventsApplied / flushCount, bufferSize: 0 };
    return this.view();
  }

  view(): TopologyRuntimeView {
    return { nodes: this.nodes, edges: this.edges, summary: this.summary, debug: { ...this.debug }, metricHistory: this.metricHistory };
  }

  isStale(lastUpdated: number, now = Date.now(), thresholdMs = 30_000) { return now - lastUpdated > thresholdMs; }
  getProcessedEventCount() { return this.processedIds.size; }

  private setNode(next: NodeRuntimeState) {
    const previous = this.nodes.get(next.nodeId);
    if (previous?.status !== next.status) {
      const summary = { ...this.summary };
      if (previous) summary[previous.status] -= 1;
      summary[next.status] += 1;
      this.summary = summary;
    }
    this.nodes.set(next.nodeId, next);
  }

  private rememberEvent(eventId: string) {
    this.processedIds.add(eventId);
    this.processedOrder.push(eventId);
    if (this.processedOrder.length <= this.processedEventLimit) return;
    const removed = this.processedOrder.shift();
    if (removed) this.processedIds.delete(removed);
  }

  private recordMetrics(metrics: Readonly<Record<string, number>>) {
    const history = new Map(this.metricHistory);
    for (const [name, value] of Object.entries(metrics)) history.set(name, [...(history.get(name) ?? []), value].slice(-METRIC_HISTORY_LIMIT));
    this.metricHistory = history;
  }
}

export function isRuntimeStateStale(state: { lastUpdated: number }, now: number, thresholdMs = 30_000) {
  return now - state.lastUpdated > thresholdMs;
}

export function coalesceRuntimeEvents(events: readonly TopologyRealtimeEvent[]) {
  const latest = new Map<string, TopologyRealtimeEvent>();
  for (const event of events) {
    const key = `${event.type}:${event.entityId}`;
    const current = latest.get(key);
    if (!current || event.sequence > current.sequence) latest.set(key, event);
  }
  return [...latest.values()];
}
