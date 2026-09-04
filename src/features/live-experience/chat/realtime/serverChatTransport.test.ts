import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { server } from '@/test/msw/server';
import {
  fetchChatHistory,
  sendChatMessage,
  ServerChatTransport,
  type ChatStreamEvent,
} from './serverChatTransport';

const BROADCAST_ID = 'bc-1';

function message(sequence: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `srv-${String(sequence)}`,
    clientMessageId: `c-${String(sequence)}`,
    broadcastId: BROADCAST_ID,
    sequence,
    authorId: 'user-1',
    displayName: 'Demo Maker',
    body: `message ${String(sequence)}`,
    sentAt: '2026-09-01T00:00:00.000Z',
    deleted: false,
    ...overrides,
  };
}

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

  joinFrames(): { broadcastId: string; afterSequence: number }[] {
    return this.sent
      .map((raw) => JSON.parse(raw) as { event: string; data: { broadcastId: string; afterSequence: number } })
      .filter((frame) => frame.event === 'join')
      .map((frame) => frame.data);
  }
}

describe('chat history and sending', () => {
  afterEach(() => {
    server.resetHandlers();
  });

  it('reads a page through the validated envelope', async () => {
    server.use(
      http.get('/api/live/broadcasts/:id/chat/messages', () =>
        HttpResponse.json({
          success: true,
          data: { messages: [message(1), message(2)], nextCursor: 2, latestSequence: 9 },
        }),
      ),
    );

    const page = await fetchChatHistory(BROADCAST_ID, 0, 2);

    expect(page.messages.map((entry) => entry.sequence)).toEqual([1, 2]);
    expect(page.nextCursor).toBe(2);
    expect(page.latestSequence).toBe(9);
  });

  it('accepts a null cursor as the end of history', async () => {
    server.use(
      http.get('/api/live/broadcasts/:id/chat/messages', () =>
        HttpResponse.json({ success: true, data: { messages: [], nextCursor: null, latestSequence: 0 } }),
      ),
    );

    await expect(fetchChatHistory(BROADCAST_ID)).resolves.toMatchObject({ nextCursor: null });
  });

  /**
   * The client id is what makes a retry idempotent. Sending it is the contract;
   * the server returns the already-stored message rather than posting twice.
   */
  it('sends the client id it was given', async () => {
    const seen: string[] = [];
    server.use(
      http.post('/api/live/broadcasts/:id/chat/messages', async ({ request }) => {
        const body = (await request.json()) as { clientMessageId: string };
        seen.push(body.clientMessageId);
        return HttpResponse.json({ success: true, data: message(1, { clientMessageId: body.clientMessageId }) });
      }),
    );

    await sendChatMessage(BROADCAST_ID, 'c-retry', 'hello');
    await sendChatMessage(BROADCAST_ID, 'c-retry', 'hello');

    expect(seen).toEqual(['c-retry', 'c-retry']);
  });

  it('surfaces a rejection rather than swallowing it', async () => {
    server.use(
      http.post('/api/live/broadcasts/:id/chat/messages', () =>
        HttpResponse.json(
          { success: false, error: { code: 'CHAT_USER_MUTED', message: 'You are muted in this chat.' } },
          { status: 403 },
        ),
      ),
    );

    await expect(sendChatMessage(BROADCAST_ID, 'c-1', 'hi')).rejects.toThrow();
  });
});

describe('ServerChatTransport', () => {
  function createTransport(lastSequence = 0) {
    const socket = new FakeSocket();
    const transport = new ServerChatTransport({
      getAccessToken: () => 'token-abc',
      getLastSequence: () => lastSequence,
      baseUrl: 'ws://localhost/api/live/chat',
      createSocket: () => socket as unknown as WebSocket,
    });

    return { transport, socket };
  }

  it('joins on open, carrying the sequence already applied', async () => {
    const { transport, socket } = createTransport(17);

    const connecting = transport.connect(BROADCAST_ID);
    socket.emit('open', {});
    await connecting;

    expect(socket.joinFrames()).toEqual([{ broadcastId: BROADCAST_ID, afterSequence: 17 }]);
  });

  it('forwards messages', async () => {
    const { transport, socket } = createTransport();
    const events: ChatStreamEvent[] = [];
    transport.subscribe((event) => events.push(event));

    const connecting = transport.connect(BROADCAST_ID);
    socket.emit('open', {});
    await connecting;

    socket.message({ type: 'message', message: message(1) });

    expect(events).toEqual([{ kind: 'message', message: message(1) }]);
  });

  /**
   * A deletion arrives as its own event so clients that already have the message
   * converge without refetching history.
   */
  it('forwards a tombstone as a deletion', async () => {
    const { transport, socket } = createTransport();
    const events: ChatStreamEvent[] = [];
    transport.subscribe((event) => events.push(event));

    const connecting = transport.connect(BROADCAST_ID);
    socket.emit('open', {});
    await connecting;

    socket.message({ type: 'deleted', messageId: 'srv-1', sequence: 1 });

    expect(events).toEqual([{ kind: 'deleted', messageId: 'srv-1', sequence: 1 }]);
  });

  it.each([
    ['a heartbeat', { type: 'heartbeat', at: 1 }],
    ['a join acknowledgement', { type: 'joined', broadcastId: BROADCAST_ID, replayed: 0 }],
  ])('ignores %s', async (_label, payload) => {
    const { transport, socket } = createTransport();
    const events: ChatStreamEvent[] = [];
    transport.subscribe((event) => events.push(event));

    const connecting = transport.connect(BROADCAST_ID);
    socket.emit('open', {});
    await connecting;

    socket.message(payload);

    expect(events).toHaveLength(0);
    expect(transport.getConnectionState()).toBe('connected');
  });

  it('drops an unparseable frame without killing the connection', async () => {
    const { transport, socket } = createTransport();

    const connecting = transport.connect(BROADCAST_ID);
    socket.emit('open', {});
    await connecting;

    socket.emit('message', { data: '<not json>' });

    expect(transport.getConnectionState()).toBe('connected');
  });

  it('reports connection state transitions', async () => {
    const { transport, socket } = createTransport();
    const states: string[] = [];
    transport.subscribeConnection((state) => states.push(state));

    const connecting = transport.connect(BROADCAST_ID);
    socket.emit('open', {});
    await connecting;
    transport.disconnect();

    expect(states).toEqual(['connecting', 'connected', 'disconnected']);
  });
});
