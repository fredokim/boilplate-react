import { Background, BackgroundVariant, Controls, MarkerType, ReactFlow, type Edge, type NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { GraphDocument, GraphMetadata, GraphNodePresentationResolver } from '../model/graph';
import { GraphNodeCard, type GraphFlowNode } from './GraphNodeCard';
import type { EdgeRuntimeState, NodeRuntimeState, NodeRuntimeStatus } from '../realtime/types';
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
  nodeRuntime: Readonly<Record<string, NodeRuntimeState>>;
  edgeRuntime: Readonly<Record<string, EdgeRuntimeState>>;
  runtimeFilter: NodeRuntimeStatus | 'all';
  isNodeStale: (nodeId: string) => boolean;
};

export function GraphCanvas<
  TNodeType extends string,
  TNodeMetadata extends GraphMetadata,
  TEdgeMetadata extends GraphMetadata,
>({ edgeRuntime, getNodePresentation, graph, isNodeStale, nodeRuntime, onNodeSelect, runtimeFilter, selectedNodeId }: GraphCanvasProps<TNodeType, TNodeMetadata, TEdgeMetadata>) {
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
      runtimeStatus: nodeRuntime[node.id]?.status ?? 'unknown',
      stale: isNodeStale(node.id),
      dimmed: runtimeFilter !== 'all' && nodeRuntime[node.id]?.status !== runtimeFilter,
    },
  }));
  const edges: Edge[] = graph.edges.map((edge) => {
    const routeHighlighted = routeEdgeIds.has(edge.id);
    const runtime = edgeRuntime[edge.id];
    const runtimeColor = runtime?.status === 'disconnected' ? '#64748b' : runtime?.status === 'degraded' ? '#d97706' : '#94a3b8';
    const color = routeHighlighted ? '#2563eb' : runtimeColor;
    return {
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      label: edge.label,
      animated: routeHighlighted,
      markerEnd: { type: MarkerType.ArrowClosed, color },
      style: { stroke: color, strokeWidth: routeHighlighted ? 3 : 2, strokeDasharray: runtime?.status === 'disconnected' ? '6 4' : undefined },
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

