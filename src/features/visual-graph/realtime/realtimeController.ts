import type { GraphDocument } from '../model/graph';
import { BACKGROUND_FLUSH_INTERVAL_MS, REALTIME_FLUSH_INTERVAL_MS, RuntimeEventBuffer } from './eventBuffer';
import { TopologyRuntimeEngine } from './runtimeState';
import type { TopologyConnectionState, TopologyRealtimeTransport, TopologyRuntimeSnapshotService, TopologyRuntimeView } from './topologyRealtime';

export type RealtimeControllerSnapshot = { connectionState: TopologyConnectionState; runtime: TopologyRuntimeView };
export type RealtimeControllerOptions = { topologyId?: string; reconnectBaseMs?: number; reconnectMaxMs?: number };

export class RealtimeTopologyController {
  private readonly engine: TopologyRuntimeEngine;
  private readonly buffer = new RuntimeEventBuffer();
  private readonly listeners = new Set<() => void>();
  private connectionState: TopologyConnectionState = 'disconnected';
  private snapshot: RealtimeControllerSnapshot;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribeEvent: (() => void) | null = null;
  private unsubscribeState: (() => void) | null = null;
  private stopped = true;
  private reconnectAttempt = 0;
  private hasConnected = false;
  private hidden = false;
  private readonly topologyId: string;

  constructor(graph: GraphDocument, private readonly transport: TopologyRealtimeTransport, private readonly snapshots: TopologyRuntimeSnapshotService, private readonly options: RealtimeControllerOptions = {}) {
    this.topologyId = options.topologyId ?? 'network-topology';
    this.engine = new TopologyRuntimeEngine(graph);
    this.snapshot = { connectionState: this.connectionState, runtime: this.engine.view() };
  }

  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  getSnapshot = () => this.snapshot;

  start() {
    if (!this.stopped) return;
    this.stopped = false;
    this.unsubscribeEvent = this.transport.subscribe((event) => {
      this.engine.noteReceived(1);
      const result = this.buffer.push(event);
      if (result.coalesced) this.engine.noteCoalesced(result.coalesced);
      if (result.duplicate) this.engine.noteDuplicate(result.duplicate);
      this.engine.setBufferSize(this.buffer.size);
    });
    this.unsubscribeState = this.transport.subscribeConnectionState((state) => this.handleConnectionState(state));
    this.restartFlushTimer();
    void this.resync();
    void this.connect(false);
  }

  stop() {
    this.stopped = true;
    if (this.flushTimer) clearInterval(this.flushTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.flushTimer = null; this.reconnectTimer = null;
    this.unsubscribeEvent?.(); this.unsubscribeState?.();
    this.unsubscribeEvent = null; this.unsubscribeState = null;
    this.transport.disconnect();
    this.connectionState = 'disconnected';
    this.publish();
  }

  setMonitoredNode(nodeId: string | null) { this.engine.setMonitoredNode(nodeId); }

  setPageVisible(visible: boolean) {
    const wasHidden = this.hidden;
    this.hidden = !visible;
    this.restartFlushTimer();
    if (wasHidden && visible && !this.stopped) void this.resync();
  }

  flush() {
    const events = this.buffer.flush();
    if (!events.length) return;
    this.snapshot = { connectionState: this.connectionState, runtime: this.engine.applyBatch(events) };
    this.emit();
  }

  private async connect(reconnect: boolean) {
    if (this.stopped) return;
    this.connectionState = reconnect ? 'reconnecting' : 'connecting';
    this.publish();
    try { await this.transport.connect(); }
    catch { this.connectionState = 'error'; this.publish(); this.scheduleReconnect(); }
  }

  private handleConnectionState(state: TopologyConnectionState) {
    if (this.stopped) return;
    this.connectionState = state;
    if (state === 'connected') {
      const reconnect = this.hasConnected;
      this.hasConnected = true;
      this.reconnectAttempt = 0;
      if (reconnect) void this.resync();
    } else if (state === 'disconnected' || state === 'error') this.scheduleReconnect();
    this.publish();
  }

  private scheduleReconnect() {
    if (this.stopped || this.reconnectTimer) return;
    this.connectionState = 'reconnecting';
    const base = this.options.reconnectBaseMs ?? 1_000;
    const max = this.options.reconnectMaxMs ?? 8_000;
    const delay = Math.min(max, base * 2 ** this.reconnectAttempt);
    this.reconnectAttempt += 1;
    this.engine.noteReconnect();
    this.reconnectTimer = setTimeout(() => { this.reconnectTimer = null; void this.connect(true); }, delay);
    this.publish();
  }

  private async resync() {
    try { const snapshot = await this.snapshots.load(this.topologyId); this.snapshot = { connectionState: this.connectionState, runtime: this.engine.applySnapshot(snapshot) }; this.emit(); }
    catch { if (!this.stopped) { this.connectionState = 'error'; this.publish(); } }
  }

  private restartFlushTimer() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    if (this.stopped) return;
    this.flushTimer = setInterval(() => this.flush(), this.hidden ? BACKGROUND_FLUSH_INTERVAL_MS : REALTIME_FLUSH_INTERVAL_MS);
  }

  private publish() { this.snapshot = { connectionState: this.connectionState, runtime: this.engine.view() }; this.emit(); }
  private emit() { for (const listener of this.listeners) listener(); }
}
