import { describe, expect, it } from 'vitest';
import { TopologyRuntimeStore } from './runtimeStore';
import type { TopologyRealtimeEvent, TopologyRuntimeSnapshot } from './types';

const topologyId = 'test';
const event = (
  overrides: Partial<TopologyRealtimeEvent> & Pick<TopologyRealtimeEvent, 'type' | 'payload'>,
): TopologyRealtimeEvent =>
  ({ eventId: `event-${String(overrides.sequence ?? 1)}`, topologyId, entityId: 'node-a', timestamp: 100, sequence: 1, ...overrides });

const createStore = (options: Partial<ConstructorParameters<typeof TopologyRuntimeStore>[0]> = {}) =>
  new TopologyRuntimeStore({ knownNodeIds: ['node-a', 'node-b'], knownEdgeIds: ['edge-a'], ...options });

describe('TopologyRuntimeStore', () => {
  it('updates runtime node state without mutating topology structure', () => {
    const store = createStore();
    store.enqueue(event({ type: 'NODE_STATUS_CHANGED', payload: { status: 'critical' } }));
    expect(store.flush()).toBe(1);
    expect(store.getSnapshot().nodes['node-a']?.status).toBe('critical');
  });

  it('updates edge runtime independently', () => {
    const store = createStore();
    store.enqueue(event({ entityId: 'edge-a', type: 'EDGE_STATUS_CHANGED', payload: { status: 'disconnected' } }));
    store.flush();
    expect(store.getSnapshot().edges['edge-a']?.status).toBe('disconnected');
    expect(store.getSnapshot().nodes).toEqual({});
  });

  it('suppresses duplicate event ids', () => {
    const store = createStore();
    const duplicate = event({ eventId: 'same', type: 'NODE_STATUS_CHANGED', payload: { status: 'warning' } });
    store.enqueue(duplicate);
    store.enqueue(duplicate);
    store.flush();
    expect(store.getSnapshot().diagnostics.duplicatesIgnored).toBe(1);
    expect(store.getSnapshot().diagnostics.applied).toBe(1);
  });

  it('ignores older sequences and applies newer sequences', () => {
    const store = createStore();
    store.enqueue(event({ eventId: '10', sequence: 10, type: 'NODE_STATUS_CHANGED', payload: { status: 'critical' } }));
    store.flush();
    store.enqueue(event({ eventId: '9', sequence: 9, type: 'NODE_STATUS_CHANGED', payload: { status: 'healthy' } }));
    store.enqueue(event({ eventId: '11', sequence: 11, type: 'NODE_STATUS_CHANGED', payload: { status: 'offline' } }));
    store.flush();
    expect(store.getSnapshot().nodes['node-a']?.status).toBe('offline');
    expect(store.getSnapshot().diagnostics.staleIgnored).toBe(1);
  });

  it('coalesces 100 same-entity updates into one latest value', () => {
    const store = createStore();
    for (let sequence = 1; sequence <= 100; sequence += 1) {
      store.enqueue(event({ eventId: String(sequence), sequence, type: 'NODE_METRIC_UPDATED', payload: { metrics: { cpu: sequence } } }));
    }
    expect(store.flush()).toBe(1);
    expect(store.getSnapshot().nodes['node-a']?.metrics.cpu).toBe(100);
    expect(store.getSnapshot().diagnostics.coalesced).toBe(99);
  });

  it('keeps status and metric updates from the same batch', () => {
    const store = createStore();
    store.enqueue(event({ eventId: 'status', sequence: 10, type: 'NODE_STATUS_CHANGED', payload: { status: 'warning' } }));
    store.enqueue(event({ eventId: 'metric', sequence: 11, type: 'NODE_METRIC_UPDATED', payload: { metrics: { cpu: 92 } } }));
    store.flush();
    expect(store.getSnapshot().nodes['node-a']).toMatchObject({ status: 'warning', metrics: { cpu: 92 }, sequence: 11 });
  });

  it('ignores unknown entities without crashing', () => {
    const store = createStore();
    store.enqueue(event({ entityId: 'deleted-node', type: 'NODE_STATUS_CHANGED', payload: { status: 'critical' } }));
    expect(store.flush()).toBe(0);
    expect(store.getSnapshot().diagnostics.unknownEntities).toBe(1);
  });

  it('does not let an older initial snapshot overwrite a realtime delta', () => {
    const store = createStore();
    store.enqueue(event({ eventId: 'live', sequence: 12, type: 'NODE_STATUS_CHANGED', payload: { status: 'critical' } }));
    store.flush();
    const snapshot: TopologyRuntimeSnapshot = {
      topologyId,
      revision: 10,
      capturedAt: 200,
      nodes: { 'node-a': { status: 'healthy', metrics: {}, lastUpdated: 90, sequence: 10 } },
      edges: {},
    };
    store.applySnapshot(snapshot);
    expect(store.getSnapshot().nodes['node-a']?.status).toBe('critical');
  });

  it('updates summary incrementally and detects stale runtime state', () => {
    const store = createStore();
    store.enqueue(event({ timestamp: 100, type: 'NODE_STATUS_CHANGED', payload: { status: 'warning' } }));
    store.flush();
    store.enqueue(event({ eventId: 'next', sequence: 2, timestamp: 200, type: 'NODE_STATUS_CHANGED', payload: { status: 'critical' } }));
    store.flush();
    expect(store.getSnapshot().summary).toMatchObject({ warning: 0, critical: 1 });
    expect(store.isNodeStale('node-a', 1_201, 1_000)).toBe(true);
  });

  it('bounds processed ids, pending events, and selected-node metric history', () => {
    const store = createStore({ processedEventLimit: 3, pendingEventLimit: 2, metricHistoryLimit: 2, monitoredNodeIds: ['node-a'] });
    for (let sequence = 1; sequence <= 5; sequence += 1) {
      store.enqueue(event({ eventId: String(sequence), entityId: sequence % 2 ? 'node-a' : 'node-b', sequence, type: 'NODE_METRIC_UPDATED', payload: { metrics: { cpu: sequence } } }));
      store.flush();
    }
    expect(store.getMemoryUsage().processedEventIds).toBe(3);
    expect(store.getMetricHistory('node-a').cpu).toEqual([3, 5]);
  });
});
