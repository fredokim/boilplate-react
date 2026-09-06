import type { ChatMessage } from '../model/chatMessage';
import type { ChatDiagnostics, ChatStoreSnapshot } from './types';

export type ChatStoreOptions = {
  /** How many messages stay in the snapshot. Older ones fall off the top. */
  retentionLimit?: number;
  /** How many messages may wait for the next flush before the oldest are dropped. */
  pendingLimit?: number;
  /** Ids remembered for duplicate suppression. */
  processedLimit?: number;
};

const emptyDiagnostics = (): ChatDiagnostics => ({
  received: 0,
  applied: 0,
  duplicatesIgnored: 0,
  outOfOrderRepositioned: 0,
  droppedTooOld: 0,
  droppedByCapacity: 0,
  flushCount: 0,
  totalBatchSize: 0,
  pendingSize: 0,
  reconnectCount: 0,
  lastMessageAt: null,
});

/**
 * Chat is an append-only log, not entity state, so this store differs from the topology
 * runtime store in what it guarantees:
 *
 *  - retention is bounded, because a broadcast runs for hours and nobody scrolls back
 *    thousands of messages;
 *  - ordering is by `sequence`, because a message can arrive after a newer one — and
 *    because `sequence` is the only order the server promises. It used to sort on the
 *    timestamp, which the server allocates at transaction start while it allocates the
 *    sequence under a row lock, so the two can disagree;
 *  - a message older than everything retained is dropped rather than inserted where no
 *    one will see it.
 *
 * What it shares with the topology store is the shape: enqueue is silent, flush notifies,
 * so the flush timer stays the only thing that drives a render.
 */
export class ChatStore {
  private readonly retentionLimit: number;
  private readonly pendingLimit: number;
  private readonly processedLimit: number;
  private readonly processedIds = new Set<string>();
  private readonly processedOrder: string[] = [];
  private pending: ChatMessage[] = [];
  private listeners = new Set<() => void>();
  private snapshot: ChatStoreSnapshot = {
    messages: [],
    diagnostics: emptyDiagnostics(),
    version: 0,
  };

  constructor(options: ChatStoreOptions = {}) {
    this.retentionLimit = options.retentionLimit ?? 300;
    this.pendingLimit = options.pendingLimit ?? 500;
    this.processedLimit = options.processedLimit ?? 2_000;
  }

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  enqueue(message: ChatMessage) {
    const diagnostics = { ...this.snapshot.diagnostics, received: this.snapshot.diagnostics.received + 1 };

    /**
     * On `id`, which names the stored message. Not on `sequence` — the server
     * hands the same message the same id on a replay and a different one is a
     * different message, so id is the question being asked. Not on
     * `clientMessageId` either: that names a send attempt, and this client is
     * receiving.
     */
    if (this.processedIds.has(message.id)) {
      diagnostics.duplicatesIgnored += 1;
      this.replaceDiagnostics(diagnostics);
      return;
    }
    this.remember(message.id);

    const oldestRetained = this.snapshot.messages[0];
    if (oldestRetained && message.sequence < oldestRetained.sequence) {
      // It would land above the window the reader can scroll to, so it is not worth keeping.
      diagnostics.droppedTooOld += 1;
      this.replaceDiagnostics(diagnostics);
      return;
    }

    if (this.pending.length >= this.pendingLimit) {
      this.pending.shift();
      diagnostics.droppedByCapacity += 1;
    }
    this.pending.push(message);
    diagnostics.pendingSize = this.pending.length;
    this.replaceDiagnostics(diagnostics);
  }

  /** Applies everything buffered since the last flush. Returns how many were applied. */
  flush() {
    if (!this.pending.length) return 0;

    const batch = this.pending;
    this.pending = [];

    let repositioned = 0;
    const sorted = [...batch].sort((left, right) => left.sequence - right.sequence);
    for (let index = 0; index < batch.length; index += 1) {
      if (batch[index] !== sorted[index]) {
        repositioned += 1;
      }
    }

    const merged = [...this.snapshot.messages, ...sorted];
    const messages = merged.length > this.retentionLimit ? merged.slice(merged.length - this.retentionLimit) : merged;
    const lastMessage = sorted.at(-1);

    this.snapshot = {
      messages,
      diagnostics: {
        ...this.snapshot.diagnostics,
        applied: this.snapshot.diagnostics.applied + sorted.length,
        outOfOrderRepositioned: this.snapshot.diagnostics.outOfOrderRepositioned + repositioned,
        flushCount: this.snapshot.diagnostics.flushCount + 1,
        totalBatchSize: this.snapshot.diagnostics.totalBatchSize + sorted.length,
        pendingSize: 0,
        lastMessageAt: lastMessage ? Date.parse(lastMessage.timestamp) : this.snapshot.diagnostics.lastMessageAt,
      },
      version: this.snapshot.version + 1,
    };
    this.emit();
    return sorted.length;
  }

  markReconnect() {
    this.replaceDiagnostics({
      ...this.snapshot.diagnostics,
      reconnectCount: this.snapshot.diagnostics.reconnectCount + 1,
    });
  }

  clear() {
    this.pending = [];
    this.processedIds.clear();
    this.processedOrder.length = 0;
    this.snapshot = { messages: [], diagnostics: emptyDiagnostics(), version: this.snapshot.version + 1 };
    this.emit();
  }

  private remember(id: string) {
    this.processedIds.add(id);
    this.processedOrder.push(id);
    if (this.processedOrder.length <= this.processedLimit) return;
    const removed = this.processedOrder.shift();
    if (removed) this.processedIds.delete(removed);
  }

  private replaceDiagnostics(diagnostics: ChatDiagnostics) {
    // Deliberately silent: only flush notifies, so a busy stream costs one render per tick.
    this.snapshot = { ...this.snapshot, diagnostics, version: this.snapshot.version + 1 };
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}
