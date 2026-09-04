import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '../model/chatMessage';
import { ChatStore } from './chatStore';

function message(id: string, isoTime: string): ChatMessage {
  return {
    id,
    userId: 'user-mina',
    displayName: 'Mina',
    profileImageUrl: '/avatars/mina.svg',
    message: id,
    timestamp: isoTime,
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

    for (let index = 0; index < 50; index += 1) store.enqueue(message(`m-${String(index)}`, at(index)));
    expect(notifications).toBe(0);
    expect(store.getSnapshot().messages).toHaveLength(0);

    store.flush();
    expect(notifications).toBe(1);
    expect(store.getSnapshot().messages).toHaveLength(50);
  });

  it('ignores a repeated id', () => {
    const store = new ChatStore();
    store.enqueue(message('dup', at(1)));
    store.enqueue(message('dup', at(2)));
    store.flush();

    expect(store.getSnapshot().messages).toHaveLength(1);
    expect(store.getSnapshot().diagnostics.duplicatesIgnored).toBe(1);
  });

  it('orders a batch by timestamp regardless of arrival order', () => {
    const store = new ChatStore();
    store.enqueue(message('late', at(30)));
    store.enqueue(message('early', at(10)));
    store.enqueue(message('middle', at(20)));
    store.flush();

    expect(store.getSnapshot().messages.map((entry) => entry.id)).toEqual(['early', 'middle', 'late']);
    expect(store.getSnapshot().diagnostics.outOfOrderRepositioned).toBeGreaterThan(0);
  });

  it('drops a message older than everything still retained', () => {
    const store = new ChatStore({ retentionLimit: 2 });
    store.enqueue(message('a', at(10)));
    store.enqueue(message('b', at(20)));
    store.flush();

    store.enqueue(message('ancient', at(1)));
    store.flush();

    expect(store.getSnapshot().messages.map((entry) => entry.id)).toEqual(['a', 'b']);
    expect(store.getSnapshot().diagnostics.droppedTooOld).toBe(1);
  });

  it('keeps only the newest messages once retention is exceeded', () => {
    const store = new ChatStore({ retentionLimit: 3 });
    for (let index = 0; index < 10; index += 1) store.enqueue(message(`m-${String(index)}`, at(index)));
    store.flush();

    expect(store.getSnapshot().messages.map((entry) => entry.id)).toEqual(['m-7', 'm-8', 'm-9']);
  });

  it('drops the oldest pending message when the buffer overflows', () => {
    const store = new ChatStore({ pendingLimit: 3 });
    for (let index = 0; index < 5; index += 1) store.enqueue(message(`m-${String(index)}`, at(index)));

    expect(store.getSnapshot().diagnostics.droppedByCapacity).toBe(2);
    store.flush();
    expect(store.getSnapshot().messages.map((entry) => entry.id)).toEqual(['m-2', 'm-3', 'm-4']);
  });

  it('returns a stable snapshot reference between changes', () => {
    const store = new ChatStore();
    const first = store.getSnapshot();
    expect(store.getSnapshot()).toBe(first);

    store.enqueue(message('a', at(1)));
    store.flush();
    expect(store.getSnapshot()).not.toBe(first);
  });
});
