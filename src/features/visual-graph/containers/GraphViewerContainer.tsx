import { useEffect, useState } from 'react';
import { getNetworkNodePresentation, networkGraph } from '../network/networkGraph';
import { createNetworkEvent, loadNetworkRuntimeSnapshot, networkRealtimeTransport, networkTopologyId } from '../network/networkRealtime';
import { useTopologyRealtime } from '../realtime/useTopologyRealtime';
import { GraphViewerView } from '../views/GraphViewerView';

export default function GraphViewerContainer() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const realtime = useTopologyRealtime({
    topologyId: networkTopologyId,
    graph: networkGraph,
    transport: networkRealtimeTransport,
    loadSnapshot: loadNetworkRuntimeSnapshot,
    selectedNodeId,
  });

  useEffect(() => {
    networkRealtimeTransport.startStress(10, createNetworkEvent);
    return () => networkRealtimeTransport.stopStress();
  }, []);

  return (
    <GraphViewerView
      getNodePresentation={getNetworkNodePresentation}
      graph={networkGraph}
      onNodeSelect={setSelectedNodeId}
      selectedNodeId={selectedNodeId}
      realtime={realtime}
    />
  );
}

