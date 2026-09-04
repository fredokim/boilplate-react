import type { RealtimeConnectionState, RuntimeSnapshotProvider } from './types';
import type { TopologyRealtimeTransport } from './transport';
import type { TopologyRuntimeStore } from './runtimeStore';

export type RealtimeControllerOptions = {
  topologyId: string;
  transport: TopologyRealtimeTransport;
  store: TopologyRuntimeStore;
  loadSnapshot: RuntimeSnapshotProvider;
  flushIntervalMs?: number;
  hiddenFlushIntervalMs?: number;
  reconnectBaseMs?: number;
  reconnectMaxMs?: number;
  random?: () => number;
};

export class TopologyRealtimeController {
  private readonly flushIntervalMs: number;
  private readonly hiddenFlushIntervalMs: number;
  private readonly reconnectBaseMs: number;
  private readonly reconnectMaxMs: number;
  private readonly random: () => number;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribeEvent: (() => void) | null = null;
  private unsubscribeConnection: (() => void) | null = null;
  private manuallyStopped = true;
  private hidden = false;
  private reconnectAttempt = 0;
  private resyncGeneration = 0;
  private connectionState: RealtimeConnectionState = 'disconnected';

  constructor(private readonly options: RealtimeControllerOptions) {
    this.flushIntervalMs = options.flushIntervalMs ?? 50;
    this.hiddenFlushIntervalMs = options.hiddenFlushIntervalMs ?? 250;
    this.reconnectBaseMs = options.reconnectBaseMs ?? 1_000;
    this.reconnectMaxMs = options.reconnectMaxMs ?? 30_000;
    this.random = options.random ?? Math.random;
  }

  async start() {
    if (!this.manuallyStopped) return;
    this.manuallyStopped = false;
    this.unsubscribeEvent = this.options.transport.subscribe((event) => this.options.store.enqueue(event));
    this.unsubscribeConnection = this.options.transport.subscribeConnection((state) => this.handleConnection(state));
    this.startFlushTimer();
    // Subscribe before loading the snapshot. Sequence checks preserve deltas that win this race.
    const initialSnapshot = this.resync();
    await this.connect();
    await initialSnapshot;
  }

  stop() {
    this.manuallyStopped = true;
    this.resyncGeneration += 1;
    this.clearTimers();
    this.unsubscribeEvent?.();
    this.unsubscribeConnection?.();
    this.unsubscribeEvent = null;
    this.unsubscribeConnection = null;
    this.options.transport.disconnect();
    this.connectionState = 'disconnected';
  }

  setHidden(hidden: boolean) {
    if (hidden === this.hidden) return;
    this.hidden = hidden;
    this.startFlushTimer();
    if (!hidden) void this.resync();
  }

  getConnectionState() {
    return this.connectionState;
  }

  async resync() {
    const generation = ++this.resyncGeneration;
    const snapshot = await this.options.loadSnapshot(this.options.topologyId);
    if (!this.manuallyStopped && generation === this.resyncGeneration) this.options.store.applySnapshot(snapshot);
  }

  private async connect() {
    try {
      await this.options.transport.connect(this.options.topologyId);
    } catch {
      this.scheduleReconnect();
    }
  }

  private handleConnection(state: RealtimeConnectionState) {
    const wasConnected = this.connectionState === 'connected';
    this.connectionState = state;
    if (state === 'connected') {
      this.clearReconnectTimer();
      if (this.reconnectAttempt > 0) {
        this.options.store.markReconnect();
        void this.resync();
      }
      this.reconnectAttempt = 0;
    } else if (wasConnected && (state === 'disconnected' || state === 'error')) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.manuallyStopped || this.reconnectTimer) return;
    this.connectionState = 'reconnecting';
    const exponential = Math.min(this.reconnectMaxMs, this.reconnectBaseMs * 2 ** this.reconnectAttempt);
    const delay = Math.round(exponential * (0.8 + this.random() * 0.4));
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
  }

  private startFlushTimer() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    if (this.manuallyStopped) return;
    this.flushTimer = setInterval(
      () => this.options.store.flush(),
      this.hidden ? this.hiddenFlushIntervalMs : this.flushIntervalMs,
    );
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private clearTimers() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = null;
    this.clearReconnectTimer();
  }
}
