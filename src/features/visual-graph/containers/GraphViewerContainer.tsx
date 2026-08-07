import { useState } from 'react';
import { getNetworkNodePresentation, networkGraph } from '../network/networkGraph';
import { GraphViewerView } from '../views/GraphViewerView';

export default function GraphViewerContainer() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  return (
    <GraphViewerView
      getNodePresentation={getNetworkNodePresentation}
      graph={networkGraph}
      onNodeSelect={setSelectedNodeId}
      selectedNodeId={selectedNodeId}
    />
  );
}

