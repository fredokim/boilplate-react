import type { EdgeRuntimeStatus, NodeRuntimeStatus, TopologyRealtimeEvent } from './types';

/**
 * What arrived on the topology socket, once it has been checked.
 *
 * `topologyEvent.ts` on the server has carried this warning since the gateway
 * was written:
 *
 *   Getting a field name wrong here does not fail a build — it makes every
 *   event look like an unknown entity and the graph quietly stops updating.
 *
 * Nothing was checking. The transport did `parsed as ServerMessage` and handed
 * whatever arrived to the runtime store, which dedupes on `eventId` and orders
 * on `sequence` — two fields it had no assurance were even present.
 *
 * Written by hand rather than with a DTO class, because the event is a
 * discriminated union and the pairing is the part worth checking: a
 * `NODE_STATUS_CHANGED` carrying `metrics`, or a status this graph has no
 * meaning for, is precisely the "payload applied to the wrong table" that
 * comment is about. A flat DTO cannot say that; the server's published
 * `TopologyEventDto` types `payload` as an open object for the same reason.
 */

const NODE_STATUSES: readonly NodeRuntimeStatus[] = ['unknown', 'healthy', 'warning', 'critical', 'offline'];
const EDGE_STATUSES: readonly EdgeRuntimeStatus[] = ['unknown', 'active', 'degraded', 'disconnected'];

export type ParsedTopologyFrame =
  | { kind: 'event'; event: TopologyRealtimeEvent }
  | { kind: 'resync-required'; reason: string }
  | { kind: 'error' }
  /**
   * Dropped. A frame this client does not understand is not a reason to tear
   * down a working stream — a server that has learned a new frame type is ahead,
   * not broken — and a malformed one is not a reason to trust it either.
   */
  | { kind: 'ignored'; reason: 'not-json' | 'not-an-object' | 'unknown-type' | 'invalid-payload' };

const ignored = (reason: Extract<ParsedTopologyFrame, { kind: 'ignored' }>['reason']): ParsedTopologyFrame => ({
  kind: 'ignored',
  reason,
});

function isString(value: unknown): value is string {
  return typeof value === 'string' && value !== '';
}

/**
 * Both of these order things, and neither may be fractional or negative.
 *
 * `sequence` is the stream's order and the resume point. `timestamp` is a wall
 * clock and orders nothing — a distinction the server's published schema now
 * spells out, and one this parser keeps by checking them the same way rather
 * than by trusting either.
 */
function isCounter(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isMetrics(value: unknown): value is Record<string, number> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

  return Object.values(value).every((entry) => typeof entry === 'number' && Number.isFinite(entry));
}

function hasBase(frame: Record<string, unknown>): boolean {
  return (
    isString(frame.eventId) &&
    isString(frame.topologyId) &&
    isString(frame.entityId) &&
    isCounter(frame.timestamp) &&
    isCounter(frame.sequence)
  );
}

/** The pairing, which is the whole point: a status event carrying metrics is rejected. */
function hasMatchingPayload(type: unknown, payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false;

  const body = payload as { status?: unknown; metrics?: unknown };

  if (type === 'NODE_STATUS_CHANGED') return NODE_STATUSES.includes(body.status as NodeRuntimeStatus);
  if (type === 'EDGE_STATUS_CHANGED') return EDGE_STATUSES.includes(body.status as EdgeRuntimeStatus);
  if (type === 'NODE_METRIC_UPDATED' || type === 'EDGE_METRIC_UPDATED') return isMetrics(body.metrics);

  return false;
}

function validateEvent(value: unknown): TopologyRealtimeEvent | null {
  if (typeof value !== 'object' || value === null) return null;

  const event = value as Record<string, unknown>;

  if (!hasBase(event)) return null;
  if (!hasMatchingPayload(event.type, event.payload)) return null;

  return event as unknown as TopologyRealtimeEvent;
}

export function parseServerTopologyFrame(raw: unknown): ParsedTopologyFrame {
  if (typeof raw !== 'string') return ignored('not-json');

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return ignored('not-json');
  }

  if (typeof parsed !== 'object' || parsed === null) return ignored('not-an-object');

  const frame = parsed as { type?: unknown; event?: unknown; reason?: unknown };

  if (frame.type === 'event') {
    const event = validateEvent(frame.event);

    return event ? { kind: 'event', event } : ignored('invalid-payload');
  }

  /**
   * Not an error state. The connection is fine; the client's position in the
   * stream is not, and only a fresh snapshot fixes that.
   */
  if (frame.type === 'resync-required') {
    return isString(frame.reason) ? { kind: 'resync-required', reason: frame.reason } : ignored('invalid-payload');
  }

  if (frame.type === 'error') return { kind: 'error' };

  // `ready`, `subscribed`, `pong` and `heartbeat` are understood and carry
  // nothing the store acts on. They are not failures, and neither is a frame
  // type this client has never heard of.
  return ignored('unknown-type');
}
