import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatController } from './chatController';
import { ChatStore } from './chatStore';
import { MockChatTransport } from './mockChatTransport';

function setup(options: { messagesPerSecond?: number; disconnectAfterMs?: number } = {}) {
  const transport = new MockChatTransport({ handshakeMs: 10, messagesPerSecond: 0, ...options });
  const store = new ChatStore();
  const controller = new ChatController({
    roomId: 'room',
    transport,
    store,
    flushIntervalMs: 100,
    reconnectBaseMs: 1_000,
    random: () => 0.5,
  });
  return { controller, store, transport };
}

describe('ChatController', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /**
   * These exist because the idle watcher releases the socket on purpose, and
   * `stop()` reports that as `disconnected` — the state the interface paints as
   * a failure. Suspending has to be distinguishable, and it has to come back.
   */
  describe('suspend and resume', () => {
    it('reports a deliberate release as suspended, not disconnected', async () => {
      const { controller } = setup();
      void controller.start();
      await vi.advanceTimersByTimeAsync(20);
      expect(controller.getConnectionState()).toBe('connected');

      controller.suspend();

      expect(controller.getConnectionState()).toBe('suspended');
    });

    it('does not reconnect while suspended', async () => {
      const { controller, transport } = setup();
      void controller.start();
      await vi.advanceTimersByTimeAsync(20);
      controller.suspend();

      // Well past any backoff the controller would have scheduled.
      await vi.advanceTimersByTimeAsync(60_000);

      expect(transport.getConnectionState()).toBe('disconnected');
      expect(controller.getConnectionState()).toBe('suspended');
    });

    it('connects again on resume', async () => {
      const { controller } = setup();
      void controller.start();
      await vi.advanceTimersByTimeAsync(20);
      controller.suspend();

      void controller.resume();
      await vi.advanceTimersByTimeAsync(20);

      expect(controller.getConnectionState()).toBe('connected');
    });

    it('ignores a resume that follows no suspend', async () => {
      const { controller } = setup();
      void controller.start();
      await vi.advanceTimersByTimeAsync(20);

      void controller.resume();
      await vi.advanceTimersByTimeAsync(20);

      expect(controller.getConnectionState()).toBe('connected');
    });
  });

  /**
   * A handshake that has never succeeded usually means the host has not
   * finished waking the server, and four attempts in seven seconds is what
   * makes it refuse to wake at all. A drop after a working connection is a
   * different thing and still retries quickly.
   */
  it('backs off further before the first connection than after a drop', async () => {
    const attempt = vi.fn(() => Promise.reject(new Error('asleep')));
    const controller = new ChatController({
      roomId: 'room',
      transport: new MockChatTransport({ handshakeMs: 10, messagesPerSecond: 0 }),
      store: new ChatStore(),
      reconnectBaseMs: 1_000,
      coldReconnectBaseMs: 8_000,
      random: () => 0.5,
      waitForServer: attempt,
    });

    void controller.start();
    await vi.advanceTimersByTimeAsync(20);
    expect(controller.getConnectionState()).toBe('reconnecting');
    expect(attempt).toHaveBeenCalledTimes(1);

    // The warm base of 1s would have tried again inside this window. The cold
    // base of 8s must not have: a burst at a waking server is the thing that
    // makes the host refuse to wake it.
    await vi.advanceTimersByTimeAsync(2_000);
    expect(attempt).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(7_000);
    expect(attempt).toHaveBeenCalledTimes(2);

    controller.stop();
  });


  /**
   * The case the cold backoff is actually for.
   *
   * A tab is abandoned, the socket is released after a minute, and the reader
   * comes back an hour later -- by which time a free instance has certainly
   * gone to sleep. If having connected once, long ago, still counted, the
   * resume would retry at the warm cadence and burst at a sleeping server: the
   * exact thing this exists to prevent, in the likeliest situation for it.
   */
  it('treats a resume after a long absence as a cold start', async () => {
    let asleep = false;
    const attempt = vi.fn(() => (asleep ? Promise.reject(new Error('asleep')) : Promise.resolve()));
    const controller = new ChatController({
      roomId: 'room',
      transport: new MockChatTransport({ handshakeMs: 10, messagesPerSecond: 0 }),
      store: new ChatStore(),
      reconnectBaseMs: 1_000,
      coldReconnectBaseMs: 8_000,
      random: () => 0.5,
      waitForServer: attempt,
    });

    void controller.start();
    await vi.advanceTimersByTimeAsync(20);
    expect(controller.getConnectionState()).toBe('connected');

    controller.suspend();
    asleep = true;
    attempt.mockClear();
    void controller.resume();
    await vi.advanceTimersByTimeAsync(20);
    expect(attempt).toHaveBeenCalledTimes(1);

    // The warm base would have tried again inside this window.
    await vi.advanceTimersByTimeAsync(2_000);
    expect(attempt).toHaveBeenCalledTimes(1);

    controller.stop();
  });

  it('connects and then applies buffered messages on the flush tick', async () => {
    const { controller, store, transport } = setup();
    void controller.start();
    await vi.advanceTimersByTimeAsync(10);
    expect(controller.getConnectionState()).toBe('connected');

    transport.emit(transport.createMessage(0));
    transport.emit(transport.createMessage(1));
    expect(store.getSnapshot().messages).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(100);
    expect(store.getSnapshot().messages).toHaveLength(2);

    controller.stop();
  });

  it('reconnects with backoff after the link drops and counts it once', async () => {
    const { controller, store, transport } = setup({ disconnectAfterMs: 50 });
    void controller.start();
    await vi.advanceTimersByTimeAsync(10 + 50);
    expect(transport.getConnectionState()).toBe('disconnected');

    // base 1000ms with the jitter stub at 0.5 gives exactly 1000ms.
    await vi.advanceTimersByTimeAsync(1_000 + 10);
    expect(controller.getConnectionState()).toBe('connected');
    expect(store.getSnapshot().diagnostics.reconnectCount).toBe(1);

    controller.stop();
  });

  it('slows the flush cadence while the page is hidden', async () => {
    const { controller, store, transport } = setup();
    void controller.start();
    await vi.advanceTimersByTimeAsync(10);

    controller.setHidden(true);
    transport.emit(transport.createMessage(0));
    await vi.advanceTimersByTimeAsync(100);
    expect(store.getSnapshot().messages).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(store.getSnapshot().messages).toHaveLength(1);

    controller.stop();
  });

  it('stops delivering after stop()', async () => {
    const { controller, store, transport } = setup();
    void controller.start();
    await vi.advanceTimersByTimeAsync(10);
    controller.stop();

    transport.emit(transport.createMessage(0));
    await vi.advanceTimersByTimeAsync(1_000);

    expect(store.getSnapshot().messages).toHaveLength(0);
    expect(transport.getConnectionState()).toBe('disconnected');
  });

  it('is safe to start twice, as StrictMode does', async () => {
    const { controller, transport } = setup();
    void controller.start();
    void controller.start();
    await vi.advanceTimersByTimeAsync(10);

    expect(transport.getConnectionState()).toBe('connected');
    controller.stop();
  });

  /**
   * The states a reader actually sees.
   *
   * The composable used to subscribe to the transport, which knows only what
   * its socket did. `suspended` is decided here, and `reconnecting` exists only
   * between a drop and the next attempt, so neither could ever reach the
   * screen: an idle release read as a fault, and a retry read as a dead link.
   */
  it('reports suspended and reconnecting to its own subscribers', async () => {
    const { controller, transport } = setup();
    const seen: string[] = [];
    void controller.start();
    await vi.advanceTimersByTimeAsync(20);
    controller.subscribeConnection((state) => seen.push(state));

    transport.simulateDrop();
    expect(seen).toContain('reconnecting');

    controller.suspend();
    expect(seen).toContain('suspended');
    expect(controller.getConnectionState()).toBe('suspended');
  });
});
