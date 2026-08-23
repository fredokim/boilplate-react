import dagre from '@dagrejs/dagre';
import type { GraphDocument, GraphMetadata } from '../model/graph';

export type GraphLayoutOptions = { direction?: 'LR' | 'TB'; nodeWidth?: number; nodeHeight?: number };

export interface GraphLayoutService {
  layout<TNodeType extends string, TNodeMetadata extends GraphMetadata, TEdgeMetadata extends GraphMetadata>(graph: GraphDocument<TNodeType, TNodeMetadata, TEdgeMetadata>, options?: GraphLayoutOptions): GraphDocument<TNodeType, TNodeMetadata, TEdgeMetadata>;
}

export const dagreLayoutService: GraphLayoutService = {
  layout(graph, { direction = 'LR', nodeHeight = 72, nodeWidth = 190 } = {}) {
    const layoutGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    layoutGraph.setGraph({ rankdir: direction, nodesep: 70, ranksep: 110 });
    graph.nodes.forEach((node) => layoutGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight }));
    graph.edges.forEach((edge) => layoutGraph.setEdge(edge.sourceNodeId, edge.targetNodeId));
    dagre.layout(layoutGraph);
    return { ...graph, nodes: graph.nodes.map((node) => { const point = layoutGraph.node(node.id) as { x: number; y: number }; return { ...node, position: { x: point.x - nodeWidth / 2, y: point.y - nodeHeight / 2 } }; }) };
  },
};
