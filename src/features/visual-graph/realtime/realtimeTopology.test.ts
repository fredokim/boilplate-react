import { afterEach, describe, expect, it, vi } from 'vitest';
import { networkGraph } from '../network/networkGraph';
import { RuntimeEventBuffer } from './eventBuffer';
import { MockTopologyRealtimeServer } from './mockTopologyTransport';
import { RealtimeTopologyController } from './realtimeController';
import { METRIC_HISTORY_LIMIT, TopologyRuntimeEngine, isRuntimeStateStale } from './runtimeState';
import { createRuntimeSnapshotFromGraph, type TopologyRealtimeEvent } from './topologyRealtime';

const nodeStatus = (sequence: number, status: 'healthy' | 'warning' | 'critical' | 'offline', eventId = `node-${String(sequence)}`, entityId = 'edge-firewall'): TopologyRealtimeEvent => ({
  eventId, topologyId: 'network-topology', entityId, timestamp: 1_000 + sequence, sequence, type: 'NODE_STATUS_CHANGED', payload: { status },
});
const edgeStatus = (sequence: number, status: 'active' | 'degraded' | 'disconnected', eventId = `edge-${String(sequence)}`): TopologyRealtimeEvent => ({
  eventId, topologyId: 'network-topology', entityId: 'firewall-to-api', timestamp: 1_000 + sequence, sequence, type: 'EDGE_STATUS_CHANGED', payload: { status },
});

describe('realtime topology data contract', () => {
  afterEach(() => vi.useRealTimers());

  it('updates node runtime state without mutating the static topology', () => {
    const graphBefore = JSON.stringify(networkGraph);
    const engine = new TopologyRuntimeEngine(networkGraph);
    const previousRuntimeMap = engine.view().nodes;
    engine.applyBatch([nodeStatus(1, 'critical')]);
    expect(engine.view().nodes.get('edge-firewall')?.status).toBe('critical');
    expect(engine.view().nodes).not.toBe(previousRuntimeMap);
    expect(JSON.stringify(networkGraph)).toBe(graphBefore);
  });

  it('updates only edge runtime state', () => {
    const engine = new TopologyRuntimeEngine(networkGraph);
    engine.applyBatch([edgeStatus(1, 'degraded')]);
    expect(engine.view().edges.get('firewall-to-api')?.status).toBe('degraded');
    expect(engine.view().nodes.size).toBe(0);
  });

  it('ignores duplicate event ids and older or equal sequences', () => {
    const engine = new TopologyRuntimeEngine(networkGraph);
    engine.applyBatch([nodeStatus(10, 'critical', 'same'), nodeStatus(10, 'critical', 'same')]);
    engine.applyBatch([nodeStatus(9, 'healthy')]);
    expect(engine.view().nodes.get('edge-firewall')?.status).toBe('critical');
    expect(engine.view().debug.duplicateIgnored).toBe(1);
    expect(engine.view().debug.staleIgnored).toBe(1);
  });

  it('accepts a newer sequence', () => {
    const engine = new TopologyRuntimeEngine(networkGraph);
    engine.applyBatch([nodeStatus(10, 'critical'), nodeStatus(11, 'healthy')]);
    expect(engine.view().nodes.get('edge-firewall')?.status).toBe('healthy');
  });

  it('buffers a burst and coalesces the same entity to the latest value', () => {
    const engine = new TopologyRuntimeEngine(networkGraph);
    const buffer = new RuntimeEventBuffer();
    for (let sequence = 1; sequence <= 100; sequence += 1) buffer.push(nodeStatus(sequence, sequence === 100 ? 'offline' : 'warning'));
    expect(buffer.push(nodeStatus(100, 'offline'))).toEqual({ coalesced: 0, duplicate: 1 });
    const batch = buffer.flush();
    engine.applyBatch(batch);
    expect(batch).toHaveLength(1);
    expect(engine.view().nodes.get('edge-firewall')?.status).toBe('offline');
    expect(engine.view().debug.flushCount).toBe(1);
  });

  it('ignores unknown entities without crashing', () => {
    const engine = new TopologyRuntimeEngine(networkGraph);
    engine.applyBatch([nodeStatus(1, 'critical', 'unknown-event', 'removed-node')]);
    expect(engine.view().nodes.has('removed-node')).toBe(false);
    expect(engine.view().debug.unknownEntityIgnored).toBe(1);
  });

  it('does not let a late initial snapshot overwrite a realtime delta', () => {
    const engine = new TopologyRuntimeEngine(networkGraph);
    engine.applyBatch([nodeStatus(10, 'critical')]);
    const staleSnapshot = createRuntimeSnapshotFromGraph(networkGraph, 'network-topology', 900);
    engine.applySnapshot({ ...staleSnapshot, nodes: staleSnapshot.nodes.map((state) => state.nodeId === 'edge-firewall' ? { ...state, status: 'healthy', sequence: 9 } : state) });
    expect(engine.view().nodes.get('edge-firewall')?.status).toBe('critical');
  });

  it('calculates stale state centrally and updates summary incrementally', () => {
    const engine = new TopologyRuntimeEngine(networkGraph);
    engine.applyBatch([nodeStatus(1, 'warning')]);
    engine.applyBatch([nodeStatus(2, 'critical')]);
    expect(engine.view().summary).toMatchObject({ warning: 0, critical: 1 });
    expect(isRuntimeStateStale({ lastUpdated: 1_000 }, 32_000, 30_000)).toBe(true);
  });

  it('bounds processed ids and selected-node metric history', () => {
    const engine = new TopologyRuntimeEngine(networkGraph, 3);
    engine.setMonitoredNode('edge-firewall');
    const metrics = Array.from({ length: METRIC_HISTORY_LIMIT + 10 }, (_, index): TopologyRealtimeEvent => ({
      eventId: `metric-${String(index)}`, topologyId: 'network-topology', entityId: 'edge-firewall', timestamp: index, sequence: index + 1,
      type: 'NODE_METRIC_UPDATED', payload: { metrics: { cpu: index } },
    }));
    engine.applyBatch(metrics);
    expect(engine.getProcessedEventCount()).toBe(3);
    expect(engine.view().metricHistory.get('cpu')).toHaveLength(METRIC_HISTORY_LIMIT);
  });

  it('keeps route membership and critical runtime state as independent facts', () => {
    const engine = new TopologyRuntimeEngine(networkGraph);
    const routeNodeIds = new Set(['core-router', 'edge-firewall', 'api-server']);
    engine.applyBatch([nodeStatus(1, 'critical')]);
    expect(routeNodeIds.has('edge-firewall')).toBe(true);
    expect(engine.view().nodes.get('edge-firewall')?.status).toBe('critical');
  });

  it('reconnects and resyncs state missed while disconnected', async () => {
    vi.useFakeTimers();
    const server = new MockTopologyRealtimeServer(networkGraph, { eventsPerSecond: 0 });
    const controller = new RealtimeTopologyController(networkGraph, server, server, { reconnectBaseMs: 10, reconnectMaxMs: 10 });
    controller.start();
    vi.runAllTicks();
    await Promise.resolve();
    server.simulateNetworkDisconnect();
    server.emit(nodeStatus(1, 'offline', 'missed'));
    expect(controller.getSnapshot().connectionState).toBe('reconnecting');
    await vi.advanceTimersByTimeAsync(10);
    await Promise.resolve();
    expect(controller.getSnapshot().connectionState).toBe('connected');
    expect(controller.getSnapshot().runtime.nodes.get('edge-firewall')?.status).toBe('offline');
    expect(controller.getSnapshot().runtime.debug.reconnectCount).toBe(1);
    controller.stop();
  });

  it('manual stop leaves the controller disconnected without reconnecting', async () => {
    vi.useFakeTimers();
    const server = new MockTopologyRealtimeServer(networkGraph, { eventsPerSecond: 0 });
    const controller = new RealtimeTopologyController(networkGraph, server, server, { reconnectBaseMs: 10 });
    controller.start();
    await Promise.resolve();
    controller.stop();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(controller.getSnapshot().connectionState).toBe('disconnected');
    expect(controller.getSnapshot().runtime.debug.reconnectCount).toBe(0);
  });
});
