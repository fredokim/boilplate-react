import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '../model/chatMessage';
import { ChatStore } from './chatStore';

/**
 * `sequence` defaults to following the timestamp, because most of these tests
 * are about retention and buffering and do not care which orders. The ones that
 * do care pass the two apart on purpose.
 */
function message(id: string, seconds: number, sequence = seconds): ChatMessage {
  return {
    id,
    sequence,
    userId: 'user-mina',
    displayName: 'Mina',
    profileImageUrl: '/avatars/mina.svg',
    message: id,
    timestamp: at(seconds),
  };
}

const at = (seconds: number) => new Date(Date.UTC(2026, 0, 1, 0, 0, seconds)).toISOString();

describe('ChatStore', () => {
  it('does not notify while enqueuing, so the flush timer drives rendering', () => {
    const store = new ChatStore();
    let notifications = 0;
    store.subscribe(() => {
      notifications += 1;
    });

    for (let index = 0; index < 50; index += 1) store.enqueue(message(`m-${String(index)}`, index));
    expect(notifications).toBe(0);
    expect(store.getSnapshot().messages).toHaveLength(0);

    store.flush();
    expect(notifications).toBe(1);
    expect(store.getSnapshot().messages).toHaveLength(50);
  });

  it('ignores a repeated id', () => {
    const store = new ChatStore();
    store.enqueue(message('dup', 1));
    store.enqueue(message('dup', 2));
    store.flush();

    expect(store.getSnapshot().messages).toHaveLength(1);
    expect(store.getSnapshot().diagnostics.duplicatesIgnored).toBe(1);
  });

  it('orders a batch by sequence regardless of arrival order', () => {
    const store = new ChatStore();
    store.enqueue(message('late', 30));
    store.enqueue(message('early', 10));
    store.enqueue(message('middle', 20));
    store.flush();

    expect(store.getSnapshot().messages.map((entry) => entry.id)).toEqual(['early', 'middle', 'late']);
    expect(store.getSnapshot().diagnostics.outOfOrderRepositioned).toBeGreaterThan(0);
  });

  /**
   * The two can disagree. `sentAt` is `now()`, which in Postgres is transaction
   * start time; `sequence` is handed out when the send takes the broadcast row's
   * lock. A transaction that began first can take the lock second, and then the
   * older timestamp belongs to the later message.
   *
   * This store sorted on the timestamp, so that pair rendered backwards — and
   * nothing said so, because both messages were present and both were readable.
   */
  it('orders on sequence when the timestamps say otherwise', () => {
    const store = new ChatStore();
    store.enqueue(message('first-to-commit', 20, 1));
    store.enqueue(message('second-to-commit', 10, 2));
    store.flush();

    expect(store.getSnapshot().messages.map((entry) => entry.id)).toEqual(['first-to-commit', 'second-to-commit']);
  });

  /**
   * Same disagreement, other consequence: a message the server ordered *after*
   * everything retained used to be thrown away for carrying an older clock.
   */
  it('keeps a message the clock calls old but the sequence calls new', () => {
    const store = new ChatStore({ retentionLimit: 2 });
    store.enqueue(message('a', 10, 1));
    store.enqueue(message('b', 20, 2));
    store.flush();

    store.enqueue(message('newest', 5, 3));
    store.flush();

    expect(store.getSnapshot().messages.map((entry) => entry.id)).toEqual(['b', 'newest']);
    expect(store.getSnapshot().diagnostics.droppedTooOld).toBe(0);
  });

  it('drops a message the server ordered before everything still retained', () => {
    const store = new ChatStore({ retentionLimit: 2 });
    store.enqueue(message('a', 10));
    store.enqueue(message('b', 20));
    store.flush();

    store.enqueue(message('ancient', 1));
    store.flush();

    expect(store.getSnapshot().messages.map((entry) => entry.id)).toEqual(['a', 'b']);
    expect(store.getSnapshot().diagnostics.droppedTooOld).toBe(1);
  });

  it('keeps only the newest messages once retention is exceeded', () => {
    const store = new ChatStore({ retentionLimit: 3 });
    for (let index = 0; index < 10; index += 1) store.enqueue(message(`m-${String(index)}`, index));
    store.flush();

    expect(store.getSnapshot().messages.map((entry) => entry.id)).toEqual(['m-7', 'm-8', 'm-9']);
  });

  it('drops the oldest pending message when the buffer overflows', () => {
    const store = new ChatStore({ pendingLimit: 3 });
    for (let index = 0; index < 5; index += 1) store.enqueue(message(`m-${String(index)}`, index));

    expect(store.getSnapshot().diagnostics.droppedByCapacity).toBe(2);
    store.flush();
    expect(store.getSnapshot().messages.map((entry) => entry.id)).toEqual(['m-2', 'm-3', 'm-4']);
  });

  it('returns a stable snapshot reference between changes', () => {
    const store = new ChatStore();
    const first = store.getSnapshot();
    expect(store.getSnapshot()).toBe(first);

    store.enqueue(message('a', 1));
    store.flush();
    expect(store.getSnapshot()).not.toBe(first);
  });
});
