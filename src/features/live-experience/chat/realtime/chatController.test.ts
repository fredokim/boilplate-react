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
});
