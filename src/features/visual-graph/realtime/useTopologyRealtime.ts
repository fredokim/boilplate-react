import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { GraphDocument } from '../model/graph';
import { MockTopologyRealtimeServer, type MockRealtimeOptions } from './mockTopologyTransport';
import { RealtimeTopologyController } from './realtimeController';

export function useTopologyRealtime(graph: GraphDocument, options?: MockRealtimeOptions) {
  const resolvedOptions = options ?? {};
  const optionsKey = `${String(resolvedOptions.eventsPerSecond ?? 1)}:${String(resolvedOptions.disconnectAfterMs ?? 0)}:${resolvedOptions.topologyId ?? ''}`;
  const controller = useMemo(() => {
    const server = new MockTopologyRealtimeServer(graph, resolvedOptions);
    return new RealtimeTopologyController(graph, server, server, resolvedOptions.topologyId ? { topologyId: resolvedOptions.topologyId } : {});
  // The graph and primitive option key intentionally define the transport lifetime.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, optionsKey]);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const setMonitoredNode = useCallback((nodeId: string | null) => controller.setMonitoredNode(nodeId), [controller]);

  useEffect(() => {
    controller.start();
    const onVisibility = () => controller.setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { document.removeEventListener('visibilitychange', onVisibility); controller.stop(); };
  }, [controller]);

  return { ...state, setMonitoredNode };
}
