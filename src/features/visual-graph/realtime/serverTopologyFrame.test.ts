import { describe, expect, it } from 'vitest';
import { parseServerTopologyFrame } from './serverTopologyFrame';

/**
 * The server has carried this warning in `topologyEvent.ts` since the gateway
 * was written:
 *
 *   Getting a field name wrong here does not fail a build — it makes every
 *   event look like an unknown entity and the graph quietly stops updating.
 *
 * Nothing was checking. The transport cast the frame and handed it to a runtime
 * store that dedupes on `eventId` and orders on `sequence`, two fields it had no
 * assurance were even present.
 */

const base = {
  eventId: 'e-1',
  topologyId: 't-1',
  entityId: 'node-a',
  timestamp: 1_700_000_000_000,
  sequence: 42,
};

const frame = (value: unknown): string => JSON.stringify(value);
const event = (extra: Record<string, unknown>): string => frame({ type: 'event', event: { ...base, ...extra } });

describe('parseServerTopologyFrame', () => {
  it('accepts a status change the server actually sends', () => {
    const parsed = parseServerTopologyFrame(event({ type: 'NODE_STATUS_CHANGED', payload: { status: 'healthy' } }));

    expect(parsed).toEqual({
      kind: 'event',
      event: { ...base, type: 'NODE_STATUS_CHANGED', payload: { status: 'healthy' } },
    });
  });

  it('accepts a metric update', () => {
    const parsed = parseServerTopologyFrame(event({ type: 'EDGE_METRIC_UPDATED', payload: { metrics: { rtt: 12 } } }));

    expect(parsed).toEqual({
      kind: 'event',
      event: { ...base, type: 'EDGE_METRIC_UPDATED', payload: { metrics: { rtt: 12 } } },
    });
  });

  /**
   * The pairing is the whole point. A payload applied to the wrong kind of event
   * is the failure the server's comment is about, and a flat shape check cannot
   * see it: every field is present and every type is right.
   */
  it('rejects a status event carrying metrics', () => {
    const parsed = parseServerTopologyFrame(event({ type: 'NODE_STATUS_CHANGED', payload: { metrics: { rtt: 12 } } }));

    expect(parsed).toEqual({ kind: 'ignored', reason: 'invalid-payload' });
  });

  it('rejects a metric event carrying a status', () => {
    const parsed = parseServerTopologyFrame(event({ type: 'NODE_METRIC_UPDATED', payload: { status: 'healthy' } }));

    expect(parsed).toEqual({ kind: 'ignored', reason: 'invalid-payload' });
  });

  /** An edge cannot be `healthy`, and a node cannot be `degraded`. */
  it('rejects a status the entity has no meaning for', () => {
    expect(parseServerTopologyFrame(event({ type: 'EDGE_STATUS_CHANGED', payload: { status: 'healthy' } }))).toEqual({
      kind: 'ignored',
      reason: 'invalid-payload',
    });
    expect(parseServerTopologyFrame(event({ type: 'NODE_STATUS_CHANGED', payload: { status: 'degraded' } }))).toEqual({
      kind: 'ignored',
      reason: 'invalid-payload',
    });
  });

  it('rejects metrics that are not numbers', () => {
    const parsed = parseServerTopologyFrame(event({ type: 'NODE_METRIC_UPDATED', payload: { metrics: { cpu: '90' } } }));

    expect(parsed).toEqual({ kind: 'ignored', reason: 'invalid-payload' });
  });

  /**
   * The two fields the store cannot work without. Without `eventId` every event
   * is new; without `sequence` none of them can be ordered.
   */
  it('rejects an event missing the field the store dedupes on', () => {
    const withoutId = { ...base, type: 'NODE_STATUS_CHANGED', payload: { status: 'healthy' } };
    delete (withoutId as Partial<typeof base>).eventId;

    expect(parseServerTopologyFrame(frame({ type: 'event', event: withoutId }))).toEqual({
      kind: 'ignored',
      reason: 'invalid-payload',
    });
  });

  it('rejects a sequence that is not a whole count', () => {
    expect(
      parseServerTopologyFrame(event({ sequence: 4.5, type: 'NODE_STATUS_CHANGED', payload: { status: 'healthy' } })),
    ).toEqual({ kind: 'ignored', reason: 'invalid-payload' });
    expect(
      parseServerTopologyFrame(event({ sequence: -1, type: 'NODE_STATUS_CHANGED', payload: { status: 'healthy' } })),
    ).toEqual({ kind: 'ignored', reason: 'invalid-payload' });
  });

  it('reports a resync as its own outcome rather than an error', () => {
    expect(parseServerTopologyFrame(frame({ type: 'resync-required', graphId: 'g-1', reason: 'retention' }))).toEqual({
      kind: 'resync-required',
      reason: 'retention',
    });
  });

  it('rejects a resync with no reason to show', () => {
    expect(parseServerTopologyFrame(frame({ type: 'resync-required', graphId: 'g-1' }))).toEqual({
      kind: 'ignored',
      reason: 'invalid-payload',
    });
  });

  it('ignores the frames it understands but does not act on', () => {
    for (const type of ['ready', 'subscribed', 'pong', 'heartbeat']) {
      expect(parseServerTopologyFrame(frame({ type }))).toEqual({ kind: 'ignored', reason: 'unknown-type' });
    }
  });

  /** A server that has learned a new frame type is ahead of this client, not broken. */
  it('ignores a frame type it has never heard of', () => {
    expect(parseServerTopologyFrame(frame({ type: 'graph-renamed', title: 'x' }))).toEqual({
      kind: 'ignored',
      reason: 'unknown-type',
    });
  });

  it('survives anything that is not a frame at all', () => {
    expect(parseServerTopologyFrame('{oh no')).toEqual({ kind: 'ignored', reason: 'not-json' });
    expect(parseServerTopologyFrame(frame(null))).toEqual({ kind: 'ignored', reason: 'not-an-object' });
    expect(parseServerTopologyFrame(new ArrayBuffer(4))).toEqual({ kind: 'ignored', reason: 'not-json' });
  });
});
