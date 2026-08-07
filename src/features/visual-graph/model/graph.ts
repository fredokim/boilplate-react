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
  metadata: TMetadata;
};

export type GraphRoute = {
  routeNodeIds: readonly string[];
  routeEdgeIds: readonly string[];
};

export type GraphDocument<
  TNodeType extends string = string,
  TNodeMetadata extends GraphMetadata = GraphMetadata,
  TEdgeMetadata extends GraphMetadata = GraphMetadata,
> = {
  nodes: readonly GraphNode<TNodeType, TNodeMetadata>[];
  edges: readonly GraphEdge<TEdgeMetadata>[];
  route?: GraphRoute;
};

export type GraphNodePresentation = {
  color: string;
  icon: string;
  typeLabel: string;
};

export type GraphNodePresentationResolver<TNodeType extends string> = (type: TNodeType) => GraphNodePresentation;

