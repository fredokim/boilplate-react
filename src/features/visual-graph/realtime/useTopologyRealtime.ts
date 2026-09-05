import { serverWakeGate } from '@core/api/serverWake';
import { watchForIdle } from '@core/realtime/idleSuspension';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { GraphDocument, GraphMetadata } from '../model/graph';
import { TopologyRealtimeController } from './controller';
import { TopologyRuntimeStore } from './runtimeStore';
import type { RuntimeSnapshotProvider } from './types';
import type { TopologyRealtimeTransport } from './transport';

export function useTopologyRealtime<
  TNodeType extends string,
  TNodeMetadata extends GraphMetadata,
  TEdgeMetadata extends GraphMetadata,
>(options: {
  topologyId: string;
  graph: GraphDocument<TNodeType, TNodeMetadata, TEdgeMetadata>;
  transport: TopologyRealtimeTransport;
  loadSnapshot: RuntimeSnapshotProvider;
  selectedNodeId: string | null;
}) {
  const { graph, loadSnapshot, selectedNodeId, topologyId, transport } = options;
  const store = useMemo(
    () =>
      new TopologyRuntimeStore({
        knownNodeIds: graph.nodes.map((node) => node.id),
        knownEdgeIds: graph.edges.map((edge) => edge.id),
      }),
    [graph],
  );
  const controller = useMemo(
    () =>
      new TopologyRealtimeController({
        topologyId,
        transport,
        store,
        loadSnapshot,
        waitForServer: () => serverWakeGate.wait(),
      }),
    [loadSnapshot, store, topologyId, transport],
  );
  const runtime = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  // The controller, not the transport. The transport reports only what its
  // socket did, so it can never say `suspended` (the controller decides that)
  // or `reconnecting` (which exists only between a drop and the next attempt).
  // Reading it here is what made an idle release show up as a failure.
  const [connectionState, setConnectionState] = useState(controller.getConnectionState());
  const [now, setNow] = useState(0);

  useEffect(() => {
    void controller.start();
    const unsubscribe = controller.subscribeConnection(setConnectionState);
    return () => {
      unsubscribe();
      controller.stop();
    };
  }, [controller]);

  useEffect(() => store.setMonitoredNode(selectedNodeId), [selectedNodeId, store]);

  /**
   * Hands the socket back when nobody is watching.
   *
   * `suspend()` and `resume()` rather than stop and start: stop already
   * disconnects and blocks the reconnect backoff, but lands on `disconnected` --
   * the state that means a fault. Suspending says which happened; resuming
   * resubscribes and
   * resyncs from a fresh snapshot -- which is what a viewer who has been away
   * needs anyway, since the retention window may have moved past them.
   */
  useEffect(() => {
    return watchForIdle({
      onIdle: () => controller.suspend(),
      onResume: () => void controller.resume(),
    });
  }, [controller]);

  useEffect(() => {
    const onVisibility = () => controller.setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    const staleTimer = setInterval(() => setNow(Date.now()), 5_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(staleTimer);
    };
  }, [controller]);

  return {
    runtime,
    connectionState,
    now,
    isNodeStale: (nodeId: string, thresholdMs = 30_000) => store.isNodeStale(nodeId, now, thresholdMs),
    selectedMetricHistory: selectedNodeId ? store.getMetricHistory(selectedNodeId) : {},
    resync: () => controller.resync(),
  };
}
