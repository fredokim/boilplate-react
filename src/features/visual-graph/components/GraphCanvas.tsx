import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type NodeTypes,
  type ReactFlowInstance,
  type Connection,
} from '@xyflow/react';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import '@xyflow/react/dist/style.css';
import type { GraphDocument, GraphMetadata, GraphNodePresentationResolver, GraphPosition } from '../model/graph';
import type { GraphValidationError } from '../editing/graphValidation';
import { getGraphEdgeVisualState, getGraphNodeVisualState, type GraphInteractionState } from '../model/graphInteraction';
import { GraphNodeCard, type GraphFlowNode } from './GraphNodeCard';
import './graphCanvas.scss';
import { createRouteLookup, getGraphDetailLevel } from '../performance/graphViewAdapter';
import { isRuntimeStateStale } from '../realtime/runtimeState';
import type { EdgeRuntimeState, NodeRuntimeState, NodeRuntimeStatus } from '../realtime/topologyRealtime';

const nodeTypes = { 'graph-node': GraphNodeCard } satisfies NodeTypes;

type GraphCanvasProps<
  TNodeType extends string,
  TNodeMetadata extends GraphMetadata,
  TEdgeMetadata extends GraphMetadata,
> = {
  graph: GraphDocument<TNodeType, TNodeMetadata, TEdgeMetadata>;
  interaction: GraphInteractionState;
  getNodePresentation: GraphNodePresentationResolver<TNodeType>;
  onNodeSelect: (nodeId: string | null) => void;
  onNodeHover: (nodeId: string | null) => void;
  onEdgeHover: (edgeId: string | null) => void;
  editable?: boolean;
  validationErrors?: readonly GraphValidationError[];
  onNodeMove?: (nodeId: string, position: GraphPosition) => void;
  onConnect?: (connection: Connection) => void;
  onEdgeSelect?: (edgeId: string) => void;
  onCanvasClick?: (position: GraphPosition) => boolean;
  onMultiSelectionChange?: (nodeIds: readonly string[], edgeIds: readonly string[]) => void;
  onDebugChange?: (metrics: { renderCount: number; zoom: number }) => void;
  nodeRuntime?: ReadonlyMap<string, NodeRuntimeState>;
  edgeRuntime?: ReadonlyMap<string, EdgeRuntimeState>;
  runtimeFilter?: 'all' | Exclude<NodeRuntimeStatus, 'healthy' | 'unknown'>;
  runtimeNow?: number;
};

export type GraphCanvasHandle = {
  fitAll: () => void;
  focusNode: (nodeId: string) => void;
  focusRoute: (nodeIds: readonly string[]) => void;
};

function GraphCanvasInner<
  TNodeType extends string,
  TNodeMetadata extends GraphMetadata,
  TEdgeMetadata extends GraphMetadata,
>(
  { edgeRuntime, editable = false, getNodePresentation, graph, interaction, nodeRuntime, onCanvasClick, onConnect, onDebugChange, onEdgeHover, onEdgeSelect, onMultiSelectionChange, onNodeHover, onNodeMove, onNodeSelect, runtimeFilter = 'all', runtimeNow = 0, validationErrors = [] }: GraphCanvasProps<
    TNodeType,
    TNodeMetadata,
    TEdgeMetadata
  >,
  ref: React.ForwardedRef<GraphCanvasHandle>,
) {
  const instanceRef = useRef<ReactFlowInstance<GraphFlowNode> | null>(null);
  const renderCount = useRef(0);
  useEffect(() => { renderCount.current += 1; });
  const [zoom, setZoom] = useState(1);
  const detailLevel = getGraphDetailLevel(zoom);
  const routeLookup = useMemo(() => createRouteLookup(interaction.activeRoute), [interaction.activeRoute]);
  const invalidNodeIds = useMemo(() => new Set(validationErrors.filter((error) => error.targetType === 'node').map((error) => error.targetId)), [validationErrors]);
  const invalidEdgeIds = useMemo(() => new Set(validationErrors.filter((error) => error.targetType === 'edge').map((error) => error.targetId)), [validationErrors]);
  const nodes = useMemo<GraphFlowNode[]>(
    () =>
      graph.nodes.map((node) => {
        const runtimeState = nodeRuntime?.get(node.id);
        return ({
        id: node.id,
        type: 'graph-node',
        position: node.position,
        selected: interaction.selection.nodeIds.includes(node.id),
        data: {
          label: node.label,
          presentation: getNodePresentation(node.type),
          visualState: getGraphNodeVisualState(node.id, interaction, routeLookup),
          editable,
          validationError: invalidNodeIds.has(node.id),
          detailLevel,
          ...(runtimeState ? { runtimeState } : {}),
          runtimeStale: runtimeState ? isRuntimeStateStale(runtimeState, runtimeNow) : false,
          runtimeFiltered: runtimeFilter !== 'all' && runtimeState?.status !== runtimeFilter,
        },
      }); }),
    [detailLevel, editable, getNodePresentation, graph.nodes, interaction, invalidNodeIds, nodeRuntime, routeLookup, runtimeFilter, runtimeNow],
  );
  const edges = useMemo<Edge[]>(
    () =>
      graph.edges.map((edge) => {
        const visualState = getGraphEdgeVisualState(edge.id, interaction, routeLookup);
        const runtimeState = edgeRuntime?.get(edge.id);
        const runtimeColor = runtimeState?.status === 'disconnected' ? '#dc2626' : runtimeState?.status === 'degraded' ? '#d97706' : '#94a3b8';
        const color = visualState.routeActive ? '#2563eb' : runtimeColor;
        return {
          id: edge.id,
          source: edge.sourceNodeId,
          target: edge.targetNodeId,
          label: detailLevel === 'compact' || graph.edges.length > 1000 ? undefined : edge.label,
          animated: visualState.routeActive,
          selected: interaction.selection.edgeIds.includes(edge.id),
          className: [visualState.dimmed ? 'graph-edge--dimmed' : '', visualState.hovered ? 'graph-edge--hovered' : '', invalidEdgeIds.has(edge.id) ? 'graph-edge--error' : '', runtimeState ? `graph-edge--runtime-${runtimeState.status}` : ''].join(' '),
          markerEnd: { type: MarkerType.ArrowClosed, color },
          style: { stroke: color, strokeWidth: visualState.routeActive || visualState.hovered ? 3 : 2 },
        };
      }),
    [detailLevel, edgeRuntime, graph.edges, interaction, invalidEdgeIds, routeLookup],
  );

  useImperativeHandle(ref, () => ({
    fitAll: () => void instanceRef.current?.fitView({ duration: 350, padding: 0.18 }),
    focusNode: (nodeId) => void instanceRef.current?.fitView({ duration: 350, maxZoom: 1.35, nodes: [{ id: nodeId }], padding: 1.5 }),
    focusRoute: (nodeIds) =>
      void instanceRef.current?.fitView({ duration: 400, maxZoom: 1.2, nodes: nodeIds.map((id) => ({ id })), padding: 0.35 }),
  }));

  return (
    <div className="graph-canvas" aria-label="Network topology graph">
      <ReactFlow
        edges={edges}
        elementsSelectable
        selectionOnDrag={editable}
        multiSelectionKeyCode={['Shift', 'Control', 'Meta']}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        maxZoom={2}
        minZoom={0.4}
        nodes={nodes}
        onlyRenderVisibleElements={graph.nodes.length >= 500}
        nodesConnectable={editable}
        nodesDraggable={editable}
        nodeTypes={nodeTypes}
        onNodeClick={(_event, node) => onNodeSelect(node.id)}
        onNodeDragStop={(_event, node) => onNodeMove?.(node.id, node.position)}
        onNodeMouseEnter={(_event, node) => onNodeHover(node.id)}
        onNodeMouseLeave={() => onNodeHover(null)}
        onEdgeMouseEnter={(_event, edge) => onEdgeHover(edge.id)}
        onEdgeMouseLeave={() => onEdgeHover(null)}
        onEdgeClick={(_event, edge) => onEdgeSelect?.(edge.id)}
        onConnect={(connection) => onConnect?.(connection)}
        onSelectionChange={({ edges: selectedEdges, nodes: selectedNodes }) => onMultiSelectionChange?.(selectedNodes.map((node) => node.id), selectedEdges.map((edge) => edge.id))}
        onInit={(instance) => {
          instanceRef.current = instance;
        }}
        onMoveEnd={(_event, viewport) => { setZoom(viewport.zoom); onDebugChange?.({ renderCount: renderCount.current, zoom: viewport.zoom }); }}
        onPaneClick={(event) => {
          const position = instanceRef.current?.screenToFlowPosition({ x: event.clientX, y: event.clientY });
          if (!position || !onCanvasClick?.(position)) onNodeSelect(null);
        }}
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

export const GraphCanvas = forwardRef(GraphCanvasInner) as <
  TNodeType extends string,
  TNodeMetadata extends GraphMetadata,
  TEdgeMetadata extends GraphMetadata,
>(
  props: GraphCanvasProps<TNodeType, TNodeMetadata, TEdgeMetadata> & { ref?: React.Ref<GraphCanvasHandle> },
) => React.ReactElement;
