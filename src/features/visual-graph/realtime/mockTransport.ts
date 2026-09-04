import type { RealtimeConnectionState, TopologyRealtimeEvent } from './types';
import type { TopologyRealtimeTransport } from './transport';

export class MockTopologyTransport implements TopologyRealtimeTransport {
  private state: RealtimeConnectionState = 'disconnected';
  private readonly eventListeners = new Set<(event: TopologyRealtimeEvent) => void>();
  private readonly connectionListeners = new Set<(state: RealtimeConnectionState) => void>();
  private stressTimer: ReturnType<typeof setInterval> | null = null;

  async connect() {
    this.setState(this.state === 'disconnected' ? 'connecting' : 'reconnecting');
    await Promise.resolve();
    this.setState('connected');
  }

  disconnect() {
    this.stopStress();
    this.setState('disconnected');
  }

  simulateDrop() {
    this.stopStress();
    this.setState('disconnected');
  }

  emit(event: TopologyRealtimeEvent) {
    if (this.state !== 'connected') return;
    this.eventListeners.forEach((listener) => listener(event));
  }

  startStress(eventsPerSecond: number, createEvent: (index: number) => TopologyRealtimeEvent) {
    this.stopStress();
    const tickMs = 50;
    const eventsPerTick = Math.max(1, Math.round((eventsPerSecond * tickMs) / 1000));
    let index = 0;
    this.stressTimer = setInterval(() => {
      for (let count = 0; count < eventsPerTick; count += 1) this.emit(createEvent(index++));
    }, tickMs);
  }

  stopStress() {
    if (this.stressTimer) clearInterval(this.stressTimer);
    this.stressTimer = null;
  }

  subscribe(listener: (event: TopologyRealtimeEvent) => void) {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  subscribeConnection(listener: (state: RealtimeConnectionState) => void) {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  getConnectionState() {
    return this.state;
  }

  private setState(state: RealtimeConnectionState) {
    this.state = state;
    this.connectionListeners.forEach((listener) => listener(state));
  }
}
