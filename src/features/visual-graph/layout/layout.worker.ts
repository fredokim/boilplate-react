import dagre from '@dagrejs/dagre';

self.onmessage = (event: MessageEvent<{ nodes: { id: string }[]; edges: { sourceNodeId: string; targetNodeId: string }[] }>) => {
  try {
    const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({})); graph.setGraph({ rankdir: 'LR', nodesep: 70, ranksep: 110 });
    event.data.nodes.forEach((node) => graph.setNode(node.id, { width: 190, height: 72 })); event.data.edges.forEach((edge) => graph.setEdge(edge.sourceNodeId, edge.targetNodeId)); dagre.layout(graph);
    const positions = Object.fromEntries(event.data.nodes.map((node) => { const point = graph.node(node.id) as { x: number; y: number }; return [node.id, { x: point.x - 95, y: point.y - 36 }]; }));
    self.postMessage({ positions });
  } catch (error) { self.postMessage({ error: error instanceof Error ? error.message : 'Layout worker failed.' }); }
};
