import type { GraphDocument, GraphMetadata, GraphRoute, GraphSelection } from './graph';
import type { GraphRouteLookup } from '../performance/graphViewAdapter';

export type GraphInteractionState = {
  selection: GraphSelection;
  hoveredNodeId: string | null;
  hoveredEdgeId: string | null;
  activeRoute: GraphRoute | null;
  sourceNodeId: string | null;
  destinationNodeId: string | null;
};

export type GraphRouteQueryState =
  | { status: 'idle'; message?: never }
  | { status: 'loading'; message?: never }
  | { status: 'success'; message?: never }
  | { status: 'no-route'; message: string }
  | { status: 'error'; message: string };

export type GraphNodeRouteRole = 'source' | 'destination' | 'path' | 'none';

export type GraphNodeVisualState = {
  selected: boolean;
  hovered: boolean;
  routeRole: GraphNodeRouteRole;
  dimmed: boolean;
};

export type GraphEdgeVisualState = {
  hovered: boolean;
  routeActive: boolean;
  dimmed: boolean;
};

export function getGraphNodeVisualState(nodeId: string, state: GraphInteractionState, lookup?: GraphRouteLookup): GraphNodeVisualState {
  const routeActive = lookup ? lookup.nodeIds.has(nodeId) : (state.activeRoute?.nodeIds.includes(nodeId) ?? false);
  const routeRole: GraphNodeRouteRole =
    state.activeRoute?.sourceNodeId === nodeId
      ? 'source'
      : state.activeRoute?.destinationNodeId === nodeId
        ? 'destination'
        : routeActive
          ? 'path'
          : 'none';

  return {
    selected: state.selection.nodeIds.includes(nodeId),
    hovered: state.hoveredNodeId === nodeId,
    routeRole,
    dimmed: state.activeRoute !== null && !routeActive,
  };
}

export function getGraphEdgeVisualState(edgeId: string, state: GraphInteractionState, lookup?: GraphRouteLookup): GraphEdgeVisualState {
  const routeActive = lookup ? lookup.edgeIds.has(edgeId) : (state.activeRoute?.edgeIds.includes(edgeId) ?? false);
  return {
    hovered: state.hoveredEdgeId === edgeId,
    routeActive,
    dimmed: state.activeRoute !== null && !routeActive,
  };
}

export function findGraphNodes<
  TNodeType extends string,
  TNodeMetadata extends GraphMetadata,
  TEdgeMetadata extends GraphMetadata,
>(graph: GraphDocument<TNodeType, TNodeMetadata, TEdgeMetadata>, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return [];

  return graph.nodes.filter((node) => {
    const searchableMetadata = Object.values(node.metadata).filter(
      (value): value is string | number => typeof value === 'string' || typeof value === 'number',
    );
    return [node.id, node.label, ...searchableMetadata]
      .map((value) => String(value).toLocaleLowerCase())
      .some((value) => value.includes(normalizedQuery));
  });
}
