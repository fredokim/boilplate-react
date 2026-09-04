import { requestDto } from '@core/api/apiClient';
import { TopologySnapshotDto } from './topologySnapshot.dto';
import type { RealtimeConnectionState, TopologyRealtimeEvent, TopologyRuntimeSnapshot } from './types';
import type { TopologyRealtimeTransport, Unsubscribe } from './transport';

/**
 * The real server transport, alongside the mock one rather than replacing it.
 *
 * `realtimeSourceMode.ts` chooses; the default stays `mock`, so tests, Storybook,
 * and a dev session with no backend behave exactly as before.
 *
 * Nothing here touches the runtime store or the controller. Enqueue/flush
 * batching, coalescing, the pending cap, hidden-tab intervals, backoff with
 * jitter, and the generation guard are all upstream of the transport and are
 * untouched by this file — which is the property the whole layering exists for.
 */

/** Fetches the snapshot the controller seeds the store with. */
export async function fetchTopologySnapshot(graphId: string): Promise<TopologyRuntimeSnapshot> {
  const response = await requestDto(
    { method: 'GET', url: `/graphs/${graphId}/topology/snapshot` },
    TopologySnapshotDto,
  );

  return {
    topologyId: response.topologyId,
    revision: response.revision,
    capturedAt: response.capturedAt,
    nodes: response.nodes as TopologyRuntimeSnapshot['nodes'],
    edges: response.edges as TopologyRuntimeSnapshot['edges'],
  };
}

type ServerMessage =
  | { type: 'ready'; connectionId: string }
  | { type: 'subscribed'; graphId: string; replayed: number }
  | { type: 'resync-required'; graphId: string; reason: string }
  | { type: 'event'; event: TopologyRealtimeEvent }
  | { type: 'heartbeat' | 'pong'; at: number }
  | { type: 'error'; code: string; message: string };

export type ServerTransportOptions = {
  /** Reads the current access token. The socket URL is built per connect, so a refreshed token is picked up. */
  getAccessToken: () => string | null;
  /** The highest sequence already applied, so a reconnect replays instead of refetching. */
  getLastSequence: () => number;
  /** Called when the server says the gap is unrecoverable and a fresh snapshot is required. */
  onResyncRequired: (reason: string) => void;
  baseUrl?: string;
  createSocket?: (url: string) => WebSocket;
};

/**
 * Speaks the gateway's protocol over a browser `WebSocket`.
 *
 * Two things it deliberately does not do: it does not reconnect, and it does not
 * buffer. The controller already owns backoff with jitter, and buffering here
 * would duplicate the pending cap that exists one layer up — and hide it.
 */
export class ServerTopologyTransport implements TopologyRealtimeTransport {
  private socket: WebSocket | null = null;
  private state: RealtimeConnectionState = 'disconnected';
  private readonly eventListeners = new Set<(event: TopologyRealtimeEvent) => void>();
  private readonly connectionListeners = new Set<(state: RealtimeConnectionState) => void>();

  constructor(private readonly options: ServerTransportOptions) {}

  connect(topologyId: string): Promise<void> {
    this.disconnect();
    this.setState('connecting');

    return new Promise((resolve, reject) => {
      const socket = (this.options.createSocket ?? ((url: string) => new WebSocket(url)))(this.socketUrl());
      this.socket = socket;

      socket.addEventListener('open', () => {
        this.setState('connected');
        // The last sequence is read at subscribe time, not at construction: by
        // the time a reconnect happens the store has moved on.
        this.send({ event: 'subscribe', data: { graphId: topologyId, lastSequence: this.options.getLastSequence() } });
        resolve();
      });

      socket.addEventListener('message', (message: MessageEvent<unknown>) => {
        this.handleMessage(message.data);
      });

      socket.addEventListener('close', () => {
        this.setState('disconnected');
      });

      socket.addEventListener('error', () => {
        this.setState('error');
        reject(new Error('Topology transport connection failed'));
      });
    });
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
    this.setState('disconnected');
  }

  subscribe(listener: (event: TopologyRealtimeEvent) => void): Unsubscribe {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  subscribeConnection(listener: (state: RealtimeConnectionState) => void): Unsubscribe {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  getConnectionState(): RealtimeConnectionState {
    return this.state;
  }

  private handleMessage(data: unknown): void {
    const message = parseMessage(data);

    // An unparseable frame is dropped rather than treated as a connection error:
    // one malformed message is not a reason to tear down a working stream.
    if (!message) return;

    switch (message.type) {
      case 'event':
        this.eventListeners.forEach((listener) => listener(message.event));
        return;

      case 'resync-required':
        // Not an error state. The connection is fine; the client's position in
        // the stream is not, and only a fresh snapshot fixes that.
        this.options.onResyncRequired(message.reason);
        return;

      case 'error':
        this.setState('error');
        return;

      default:
        // ready, subscribed, heartbeat, pong — nothing for the store to do.
        return;
    }
  }

  private socketUrl(): string {
    const base = this.options.baseUrl ?? defaultBaseUrl();
    const token = this.options.getAccessToken();

    // The token goes in the query string because a browser cannot set headers on
    // a WebSocket handshake. It is the short-lived access token for that reason.
    return token ? `${base}?token=${encodeURIComponent(token)}` : base;
  }

  private send(message: { event: string; data: unknown }): void {
    try {
      this.socket?.send(JSON.stringify(message));
    } catch {
      this.setState('error');
    }
  }

  private setState(state: RealtimeConnectionState): void {
    if (state === this.state) return;
    this.state = state;
    this.connectionListeners.forEach((listener) => listener(state));
  }
}

function defaultBaseUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/topology`;
}

function parseMessage(data: unknown): ServerMessage | null {
  if (typeof data !== 'string') return null;

  try {
    const parsed: unknown = JSON.parse(data);
    if (typeof parsed !== 'object' || parsed === null) return null;
    if (typeof (parsed as { type?: unknown }).type !== 'string') return null;

    return parsed as ServerMessage;
  } catch {
    return null;
  }
}
