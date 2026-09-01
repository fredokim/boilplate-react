import { describe, expect, it, vi } from 'vitest';
import { ServerTopologyTransport } from './serverTopologySource';
import type { TopologyRealtimeEvent } from './types';

/**
 * A minimal stand-in for a browser WebSocket. The transport is the only thing
 * under test — the store, the controller, and their batching are upstream and
 * deliberately untouched by this layer.
 */
class FakeSocket {
  readonly sent: string[] = [];
  closed = false;
  private readonly listeners = new Map<string, ((event: unknown) => void)[]>();

  addEventListener(type: string, listener: (event: unknown) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closed = true;
    this.emit('close', {});
  }

  emit(type: string, event: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  message(payload: unknown): void {
    this.emit('message', { data: JSON.stringify(payload) });
  }

  subscribeFrames(): { graphId: string; lastSequence: number }[] {
    return this.sent
      .map((raw) => JSON.parse(raw) as { event: string; data: { graphId: string; lastSequence: number } })
      .filter((frame) => frame.event === 'subscribe')
      .map((frame) => frame.data);
  }
}

function createTransport(overrides: Partial<Parameters<typeof buildOptions>[0]> = {}) {
  const socket = new FakeSocket();
  const onResyncRequired = vi.fn();
  const options = buildOptions({ lastSequence: 0, token: 'token-abc', ...overrides });

  const transport = new ServerTopologyTransport({
    ...options,
    onResyncRequired,
    baseUrl: 'ws://localhost/api/topology',
    createSocket: () => socket as unknown as WebSocket,
  });

  return { transport, socket, onResyncRequired };
}

function buildOptions(input: { lastSequence: number; token: string | null }) {
  return {
    getAccessToken: () => input.token,
    getLastSequence: () => input.lastSequence,
  };
}

const event: TopologyRealtimeEvent = {
  eventId: 'evt-1',
  topologyId: 'graph-1',
  entityId: 'node-1',
  timestamp: 1,
  sequence: 4,
  type: 'NODE_STATUS_CHANGED',
  payload: { status: 'warning' },
};

describe('ServerTopologyTransport', () => {
  it('subscribes on open, carrying the sequence already applied', async () => {
    const { transport, socket } = createTransport({ lastSequence: 12 });

    const connecting = transport.connect('graph-1');
    socket.emit('open', {});
    await connecting;

    expect(socket.subscribeFrames()).toEqual([{ graphId: 'graph-1', lastSequence: 12 }]);
  });

  /**
   * The sequence is read at subscribe time rather than captured at construction:
   * by the time a reconnect happens, the store has moved on and sending the old
   * number would replay events the client already has.
   */
  it('reads the sequence again on every connect', async () => {
    let sequence = 3;
    // A socket per connect, as a browser gives. Reusing one instance would leave
    // the first connect's listeners attached and double every frame.
    const sockets: FakeSocket[] = [];
    const transport = new ServerTopologyTransport({
      getAccessToken: () => 'token',
      getLastSequence: () => sequence,
      onResyncRequired: vi.fn(),
      baseUrl: 'ws://localhost/api/topology',
      createSocket: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket as unknown as WebSocket;
      },
    });

    const first = transport.connect('graph-1');
    sockets[0]?.emit('open', {});
    await first;

    sequence = 40;
    const second = transport.connect('graph-1');
    sockets[1]?.emit('open', {});
    await second;

    expect(sockets[0]?.subscribeFrames().map((frame) => frame.lastSequence)).toEqual([3]);
    expect(sockets[1]?.subscribeFrames().map((frame) => frame.lastSequence)).toEqual([40]);
  });

  it('forwards events to subscribers', async () => {
    const { transport, socket } = createTransport();
    const received: TopologyRealtimeEvent[] = [];
    transport.subscribe((incoming) => received.push(incoming));

    const connecting = transport.connect('graph-1');
    socket.emit('open', {});
    await connecting;

    socket.message({ type: 'event', event });

    expect(received).toEqual([event]);
  });

  /**
   * A resync is not a connection failure. The socket is healthy; the client's
   * position in the stream is not, and only a fresh snapshot fixes that.
   */
  it('reports a resync without entering an error state', async () => {
    const { transport, socket, onResyncRequired } = createTransport();

    const connecting = transport.connect('graph-1');
    socket.emit('open', {});
    await connecting;

    socket.message({ type: 'resync-required', graphId: 'graph-1', reason: 'behind-retention' });

    expect(onResyncRequired).toHaveBeenCalledWith('behind-retention');
    expect(transport.getConnectionState()).toBe('connected');
  });

  it.each([
    ['a heartbeat', { type: 'heartbeat', at: 1 }],
    ['a subscribe acknowledgement', { type: 'subscribed', graphId: 'graph-1', replayed: 0 }],
    ['a ready frame', { type: 'ready', connectionId: 'abc' }],
  ])('ignores %s', async (_label, payload) => {
    const { transport, socket } = createTransport();
    const received: TopologyRealtimeEvent[] = [];
    transport.subscribe((incoming) => received.push(incoming));

    const connecting = transport.connect('graph-1');
    socket.emit('open', {});
    await connecting;

    socket.message(payload);

    expect(received).toHaveLength(0);
    expect(transport.getConnectionState()).toBe('connected');
  });

  /** One malformed frame is not a reason to tear down a working stream. */
  it('drops an unparseable frame without killing the connection', async () => {
    const { transport, socket } = createTransport();

    const connecting = transport.connect('graph-1');
    socket.emit('open', {});
    await connecting;

    socket.emit('message', { data: 'not json at all' });

    expect(transport.getConnectionState()).toBe('connected');
  });

  it('enters an error state when the server reports one', async () => {
    const { transport, socket } = createTransport();

    const connecting = transport.connect('graph-1');
    socket.emit('open', {});
    await connecting;

    socket.message({ type: 'error', code: 'GRAPH_NOT_FOUND', message: 'Graph not found.' });

    expect(transport.getConnectionState()).toBe('error');
  });

  it('notifies connection listeners as the state moves', async () => {
    const { transport, socket } = createTransport();
    const states: string[] = [];
    transport.subscribeConnection((state) => states.push(state));

    const connecting = transport.connect('graph-1');
    socket.emit('open', {});
    await connecting;
    transport.disconnect();

    expect(states).toEqual(['connecting', 'connected', 'disconnected']);
  });

  it('closes the previous socket when reconnecting', async () => {
    const sockets: FakeSocket[] = [];
    const transport = new ServerTopologyTransport({
      getAccessToken: () => 'token',
      getLastSequence: () => 0,
      onResyncRequired: vi.fn(),
      baseUrl: 'ws://localhost/api/topology',
      createSocket: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket as unknown as WebSocket;
      },
    });

    const first = transport.connect('graph-1');
    sockets[0]?.emit('open', {});
    await first;

    const second = transport.connect('graph-1');
    sockets[1]?.emit('open', {});
    await second;

    expect(sockets[0]?.closed).toBe(true);
    expect(sockets[1]?.closed).toBe(false);
  });
});
