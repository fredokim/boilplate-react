import type { ChatStore } from './chatStore';
import type { ChatConnectionState, ChatTransport } from './types';

export type ChatControllerOptions = {
  roomId: string;
  transport: ChatTransport;
  store: ChatStore;
  flushIntervalMs?: number;
  hiddenFlushIntervalMs?: number;
  reconnectBaseMs?: number;
  reconnectMaxMs?: number;
  random?: () => number;
};

export class ChatController {
  private readonly flushIntervalMs: number;
  private readonly hiddenFlushIntervalMs: number;
  private readonly reconnectBaseMs: number;
  private readonly reconnectMaxMs: number;
  private readonly random: () => number;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribeMessage: (() => void) | null = null;
  private unsubscribeConnection: (() => void) | null = null;
  private manuallyStopped = true;
  private suspended = false;
  private hidden = false;
  private reconnectAttempt = 0;
  private connectionState: ChatConnectionState = 'idle';

  constructor(private readonly options: ChatControllerOptions) {
    this.flushIntervalMs = options.flushIntervalMs ?? 120;
    this.hiddenFlushIntervalMs = options.hiddenFlushIntervalMs ?? 1_000;
    this.reconnectBaseMs = options.reconnectBaseMs ?? 1_000;
    this.reconnectMaxMs = options.reconnectMaxMs ?? 30_000;
    this.random = options.random ?? Math.random;
  }

  async start() {
    if (!this.manuallyStopped) return;
    this.manuallyStopped = false;
    this.suspended = false;
    this.unsubscribeMessage = this.options.transport.subscribe((message) => this.options.store.enqueue(message));
    this.unsubscribeConnection = this.options.transport.subscribeConnection((state) => this.handleConnection(state));
    this.startFlushTimer();
    await this.connect();
  }

  stop() {
    this.manuallyStopped = true;
    this.clearTimers();
    this.unsubscribeMessage?.();
    this.unsubscribeConnection?.();
    this.unsubscribeMessage = null;
    this.unsubscribeConnection = null;
    this.options.transport.disconnect();
    this.connectionState = 'disconnected';
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
    this.stop();
    this.suspended = true;
    this.connectionState = 'suspended';
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
  }

  getConnectionState() {
    return this.connectionState;
  }

  private async connect() {
    try {
      await this.options.transport.connect(this.options.roomId);
    } catch {
      this.scheduleReconnect();
    }
  }

  private handleConnection(state: ChatConnectionState) {
    const wasConnected = this.connectionState === 'connected';
    this.connectionState = state;

    if (state === 'connected') {
      this.clearReconnectTimer();
      if (this.reconnectAttempt > 0) this.options.store.markReconnect();
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
