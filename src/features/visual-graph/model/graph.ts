export type GraphMetadata = Record<string, unknown>;

export type GraphPosition = {
  x: number;
  y: number;
};

export type GraphNode<TNodeType extends string = string, TMetadata extends GraphMetadata = GraphMetadata> = {
  id: string;
  type: TNodeType;
  label: string;
  position: GraphPosition;
  metadata: TMetadata;
};

export type GraphEdge<TMetadata extends GraphMetadata = GraphMetadata> = {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string;
  sourcePortId?: string;
  targetPortId?: string;
  metadata: TMetadata;
};

export type GraphSelection = {
  nodeIds: readonly string[];
  edgeIds: readonly string[];
  groupIds: readonly string[];
};

export const emptyGraphSelection = (): GraphSelection => ({ nodeIds: [], edgeIds: [], groupIds: [] });

export type GraphGroup = {
  id: string;
  name: string;
  childNodeIds: readonly string[];
  expanded: boolean;
};

export type GraphRoute = {
  id: string;
  sourceNodeId: string;
  destinationNodeId: string;
  nodeIds: readonly string[];
  edgeIds: readonly string[];
  metadata?: GraphMetadata;
};

export type GraphDocument<
  TNodeType extends string = string,
  TNodeMetadata extends GraphMetadata = GraphMetadata,
  TEdgeMetadata extends GraphMetadata = GraphMetadata,
> = {
  nodes: readonly GraphNode<TNodeType, TNodeMetadata>[];
  edges: readonly GraphEdge<TEdgeMetadata>[];
  groups?: readonly GraphGroup[];
};

export type GraphNodePresentation = {
  color: string;
  icon: string;
  typeLabel: string;
};

export type GraphNodePresentationResolver<TNodeType extends string> = (type: TNodeType) => GraphNodePresentation;
