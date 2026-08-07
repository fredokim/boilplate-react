import { Background, BackgroundVariant, Controls, MarkerType, ReactFlow, type Edge, type NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { GraphDocument, GraphMetadata, GraphNodePresentationResolver } from '../model/graph';
import { GraphNodeCard, type GraphFlowNode } from './GraphNodeCard';
import './graphCanvas.scss';

const nodeTypes = { 'graph-node': GraphNodeCard } satisfies NodeTypes;

type GraphCanvasProps<
  TNodeType extends string,
  TNodeMetadata extends GraphMetadata,
  TEdgeMetadata extends GraphMetadata,
> = {
  graph: GraphDocument<TNodeType, TNodeMetadata, TEdgeMetadata>;
  selectedNodeId: string | null;
  getNodePresentation: GraphNodePresentationResolver<TNodeType>;
  onNodeSelect: (nodeId: string | null) => void;
};

export function GraphCanvas<
  TNodeType extends string,
  TNodeMetadata extends GraphMetadata,
  TEdgeMetadata extends GraphMetadata,
>({ getNodePresentation, graph, onNodeSelect, selectedNodeId }: GraphCanvasProps<TNodeType, TNodeMetadata, TEdgeMetadata>) {
  const routeNodeIds = new Set(graph.route?.routeNodeIds ?? []);
  const routeEdgeIds = new Set(graph.route?.routeEdgeIds ?? []);
  const nodes: GraphFlowNode[] = graph.nodes.map((node) => ({
    id: node.id,
    type: 'graph-node',
    position: node.position,
    selected: node.id === selectedNodeId,
    data: {
      label: node.label,
      presentation: getNodePresentation(node.type),
      routeHighlighted: routeNodeIds.has(node.id),
    },
  }));
  const edges: Edge[] = graph.edges.map((edge) => {
    const routeHighlighted = routeEdgeIds.has(edge.id);
    return {
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      label: edge.label,
      animated: routeHighlighted,
      markerEnd: { type: MarkerType.ArrowClosed, color: routeHighlighted ? '#2563eb' : '#94a3b8' },
      style: { stroke: routeHighlighted ? '#2563eb' : '#94a3b8', strokeWidth: routeHighlighted ? 3 : 2 },
    };
  });

  return (
    <div className="graph-canvas" aria-label="Network topology graph">
      <ReactFlow
        edges={edges}
        elementsSelectable
        fitView
        fitViewOptions={{ padding: 0.18 }}
        maxZoom={2}
        minZoom={0.4}
        nodes={nodes}
        nodesConnectable={false}
        nodesDraggable={false}
        nodeTypes={nodeTypes}
        onNodeClick={(_event, node) => onNodeSelect(node.id)}
        onPaneClick={() => onNodeSelect(null)}
        panOnDrag
        zoomOnDoubleClick={false}
        zoomOnPinch
        zoomOnScroll
      >
        <Background color="#cbd5e1" gap={20} size={1} variant={BackgroundVariant.Dots} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

