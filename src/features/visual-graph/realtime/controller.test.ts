import { afterEach, describe, expect, it, vi } from 'vitest';
import { TopologyRealtimeController } from './controller';
import { MockTopologyTransport } from './mockTransport';
import { TopologyRuntimeStore } from './runtimeStore';

afterEach(() => vi.useRealTimers());

describe('TopologyRealtimeController', () => {
  it('batches events and never reconnects after a manual stop', async () => {
    vi.useFakeTimers();
    const transport = new MockTopologyTransport();
    const store = new TopologyRuntimeStore({ knownNodeIds: ['node-a'], knownEdgeIds: [] });
    const controller = new TopologyRealtimeController({
      topologyId: 'test',
      transport,
      store,
      flushIntervalMs: 50,
      reconnectBaseMs: 10,
      random: () => 0.5,
      loadSnapshot: async () => ({ topologyId: 'test', revision: 1, capturedAt: 1, nodes: {}, edges: {} }),
    });
    await controller.start();
    for (let sequence = 1; sequence <= 100; sequence += 1) {
      transport.emit({ eventId: String(sequence), topologyId: 'test', entityId: 'node-a', timestamp: sequence, sequence, type: 'NODE_METRIC_UPDATED', payload: { metrics: { cpu: sequence } } });
    }
    await vi.advanceTimersByTimeAsync(50);
    expect(store.getSnapshot().nodes['node-a']?.metrics.cpu).toBe(100);
    expect(store.getSnapshot().diagnostics.flushCount).toBe(1);
    controller.stop();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(transport.getConnectionState()).toBe('disconnected');
  });
});
