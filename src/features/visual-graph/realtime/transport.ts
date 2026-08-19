import type { RealtimeConnectionState, TopologyRealtimeEvent } from './types';

export type Unsubscribe = () => void;

export interface TopologyRealtimeTransport {
  connect(topologyId: string): Promise<void>;
  disconnect(): void;
  subscribe(listener: (event: TopologyRealtimeEvent) => void): Unsubscribe;
  subscribeConnection(listener: (state: RealtimeConnectionState) => void): Unsubscribe;
  getConnectionState(): RealtimeConnectionState;
}

type WebSocketLike = Pick<WebSocket, 'addEventListener' | 'close'>;

export class WebSocketTopologyTransport implements TopologyRealtimeTransport {
  private socket: WebSocketLike | null = null;
  private state: RealtimeConnectionState = 'disconnected';
  private readonly eventListeners = new Set<(event: TopologyRealtimeEvent) => void>();
  private readonly connectionListeners = new Set<(state: RealtimeConnectionState) => void>();

  constructor(
    private readonly createSocket: (topologyId: string) => WebSocketLike,
    private readonly parseEvent: (data: unknown) => TopologyRealtimeEvent = (data) =>
      JSON.parse(String(data)) as TopologyRealtimeEvent,
  ) {}

  connect(topologyId: string): Promise<void> {
    this.disconnect();
    this.setState('connecting');
    return new Promise((resolve, reject) => {
      const socket = this.createSocket(topologyId);
      this.socket = socket;
      socket.addEventListener('open', () => {
        this.setState('connected');
        resolve();
      });
      socket.addEventListener('message', (message) => {
        try {
          const event = this.parseEvent('data' in message ? message.data : message);
          this.eventListeners.forEach((listener) => listener(event));
        } catch {
          this.setState('error');
        }
      });
      socket.addEventListener('close', () => this.setState('disconnected'));
      socket.addEventListener('error', () => {
        this.setState('error');
        reject(new Error('Realtime transport connection failed'));
      });
    });
  }

  disconnect() {
    this.socket?.close();
    this.socket = null;
    this.setState('disconnected');
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
    if (state === this.state) return;
    this.state = state;
    this.connectionListeners.forEach((listener) => listener(state));
  }
}
