import type { TopologyRealtimeEvent } from './topologyRealtime';

export const REALTIME_FLUSH_INTERVAL_MS = 50;
export const BACKGROUND_FLUSH_INTERVAL_MS = 250;
export const MAX_PENDING_RUNTIME_EVENTS = 5_000;

export class RuntimeEventBuffer {
  private pending = new Map<string, TopologyRealtimeEvent>();
  private pendingIds = new Set<string>();

  constructor(private readonly capacity = MAX_PENDING_RUNTIME_EVENTS) {}

  push(event: TopologyRealtimeEvent) {
    if (this.pendingIds.has(event.eventId)) return { coalesced: 0, duplicate: 1 };
    const key = `${event.type}:${event.entityId}`;
    const previous = this.pending.get(key);
    if (!previous || event.sequence >= previous.sequence) {
      if (previous) this.pendingIds.delete(previous.eventId);
      this.pending.set(key, event);
      this.pendingIds.add(event.eventId);
    }
    let dropped = previous ? 1 : 0;
    while (this.pending.size > this.capacity) {
      const oldest = this.pending.keys().next().value;
      if (!oldest) break;
      const removed = this.pending.get(oldest);
      this.pending.delete(oldest);
      if (removed) this.pendingIds.delete(removed.eventId);
      dropped += 1;
    }
    return { coalesced: dropped, duplicate: 0 };
  }

  flush() {
    const events = [...this.pending.values()];
    this.pending.clear();
    this.pendingIds.clear();
    return events;
  }

  get size() { return this.pending.size; }
  clear() { this.pending.clear(); this.pendingIds.clear(); }
}
