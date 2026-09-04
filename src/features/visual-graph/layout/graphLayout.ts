import type { GraphDocument, GraphMetadata } from '../model/graph';

export interface GraphLayoutEngine {
  layout<
    TNodeType extends string,
    TNodeMetadata extends GraphMetadata,
    TEdgeMetadata extends GraphMetadata,
  >(
    graph: GraphDocument<TNodeType, TNodeMetadata, TEdgeMetadata>,
  ): GraphDocument<TNodeType, TNodeMetadata, TEdgeMetadata>;
}

export const providedPositionLayout: GraphLayoutEngine = {
  layout: (graph) => graph,
};
