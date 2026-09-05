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
  /**
   * The base used until the socket has opened once.
   *
   * A drop after a working connection is usually a blip and deserves a fast
   * retry. A handshake that has never succeeded is a different situation --
   * most often a host that has not finished waking the server -- and retrying
   * it four times in seven seconds is what makes the platform refuse to wake it
   * at all.
   */
  coldReconnectBaseMs?: number;
  /** Awaited before each connect, so a burst becomes one wake-up attempt. */
  waitForServer?: () => Promise<void>;
  reconnectMaxMs?: number;
  random?: () => number;
};

export class TopologyRealtimeController {
  private readonly flushIntervalMs: number;
  private readonly hiddenFlushIntervalMs: number;
  private readonly reconnectBaseMs: number;
  private readonly coldReconnectBaseMs: number;
  private hasConnected = false;
  private readonly reconnectMaxMs: number;
  private readonly random: () => number;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribeEvent: (() => void) | null = null;
  private unsubscribeConnection: (() => void) | null = null;
  private manuallyStopped = true;
  private suspended = false;
  private hidden = false;
  private reconnectAttempt = 0;
  private resyncGeneration = 0;
  private connectionState: RealtimeConnectionState = 'disconnected';
  private readonly connectionListeners = new Set<(state: RealtimeConnectionState) => void>();

  constructor(private readonly options: RealtimeControllerOptions) {
    this.flushIntervalMs = options.flushIntervalMs ?? 50;
    this.hiddenFlushIntervalMs = options.hiddenFlushIntervalMs ?? 250;
    this.reconnectBaseMs = options.reconnectBaseMs ?? 1_000;
    this.coldReconnectBaseMs = options.coldReconnectBaseMs ?? 8_000;
    this.reconnectMaxMs = options.reconnectMaxMs ?? 30_000;
    this.random = options.random ?? Math.random;
  }

  async start() {
    if (!this.manuallyStopped) return;
    this.manuallyStopped = false;
    this.suspended = false;
    this.unsubscribeEvent = this.options.transport.subscribe((event) => this.options.store.enqueue(event));
    this.unsubscribeConnection = this.options.transport.subscribeConnection((state) => this.handleConnection(state));
    this.startFlushTimer();
    // Subscribe before loading the snapshot. Sequence checks preserve deltas that win this race.
    const initialSnapshot = this.resync();
    await this.connect();
    await initialSnapshot;
  }

  stop(reason: 'closed' | 'suspended' = 'closed') {
    this.manuallyStopped = true;
    this.resyncGeneration += 1;
    this.clearTimers();
    this.unsubscribeEvent?.();
    this.unsubscribeConnection?.();
    this.unsubscribeEvent = null;
    this.unsubscribeConnection = null;
    this.options.transport.disconnect();
    // Set once, after the transport subscription is gone, so a deliberate
    // release is not preceded on screen by the `disconnected` the socket's own
    // close would otherwise announce.
    this.setConnectionState(reason === 'suspended' ? 'suspended' : 'disconnected');
  }

  /**
   * Releases the connection without calling it a failure.
   *
   * `stop()` would do the same work, but it lands on `disconnected` — the state
   * that means something broke. Idle release is not a fault and must not read
   * as one, so it has its own state and its own way back.
   */
  suspend() {
    if (this.manuallyStopped) return;
    this.stop('suspended');
    this.suspended = true;
  }

  async resume() {
    if (!this.suspended) return;
    this.suspended = false;
    await this.start();
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

  /**
   * The connection state a reader should see.
   *
   * Subscribing to the transport instead loses everything the controller knows
   * on its own: `suspended`, which the controller decides, and `reconnecting`,
   * which only exists between a drop and the next attempt. A transport that
   * reports only what its socket did can say neither, so both states were
   * unreachable from the interface even though the vocabulary named them.
   */
  subscribeConnection(listener: (state: RealtimeConnectionState) => void): () => void {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  private setConnectionState(state: RealtimeConnectionState) {
    if (this.connectionState === state) return;
    this.connectionState = state;
    this.connectionListeners.forEach((listener) => listener(state));
  }

  async resync() {
    const generation = ++this.resyncGeneration;
    const snapshot = await this.options.loadSnapshot(this.options.topologyId);
    if (!this.manuallyStopped && generation === this.resyncGeneration) this.options.store.applySnapshot(snapshot);
  }

  private async connect() {
    try {
      await this.options.waitForServer?.();
      await this.options.transport.connect(this.options.topologyId);
    } catch {
      this.scheduleReconnect();
    }
  }

  private handleConnection(state: RealtimeConnectionState) {
    const wasConnected = this.connectionState === 'connected';
    this.setConnectionState(state);
    if (state === 'connected') {
      this.hasConnected = true;
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
    this.setConnectionState('reconnecting');
    const base = this.hasConnected ? this.reconnectBaseMs : this.coldReconnectBaseMs;
    const exponential = Math.min(this.reconnectMaxMs, base * 2 ** this.reconnectAttempt);
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
