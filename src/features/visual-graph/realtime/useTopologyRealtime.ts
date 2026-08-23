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
    () => new TopologyRealtimeController({ topologyId, transport, store, loadSnapshot }),
    [loadSnapshot, store, topologyId, transport],
  );
  const runtime = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [connectionState, setConnectionState] = useState(transport.getConnectionState());
  const [now, setNow] = useState(0);

  useEffect(() => {
    void controller.start();
    const unsubscribe = transport.subscribeConnection(setConnectionState);
    return () => {
      unsubscribe();
      controller.stop();
    };
  }, [controller, transport]);

  useEffect(() => store.setMonitoredNode(selectedNodeId), [selectedNodeId, store]);

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
