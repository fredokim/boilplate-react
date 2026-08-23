import type { GraphDocument, GraphMetadata } from '../model/graph';

export type GraphValidationError = {
  targetType: 'graph' | 'node' | 'edge';
  targetId: string;
  code: string;
  message: string;
};

export type GraphValidationResult = { valid: boolean; errors: readonly GraphValidationError[] };

export function validateGraphStructure<TNodeType extends string, TNodeMetadata extends GraphMetadata, TEdgeMetadata extends GraphMetadata>(
  graph: GraphDocument<TNodeType, TNodeMetadata, TEdgeMetadata>,
): GraphValidationResult {
  const errors: GraphValidationError[] = [];
  const nodeIds = new Set<string>();
  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) errors.push({ targetType: 'node', targetId: node.id, code: 'DUPLICATE_NODE_ID', message: 'Node id must be unique.' });
    nodeIds.add(node.id);
  }
  const connections = new Set<string>();
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.sourceNodeId)) errors.push({ targetType: 'edge', targetId: edge.id, code: 'MISSING_SOURCE', message: 'Edge source does not exist.' });
    if (!nodeIds.has(edge.targetNodeId)) errors.push({ targetType: 'edge', targetId: edge.id, code: 'MISSING_TARGET', message: 'Edge target does not exist.' });
    if (edge.sourceNodeId === edge.targetNodeId) errors.push({ targetType: 'edge', targetId: edge.id, code: 'SELF_EDGE', message: 'Self connections are not allowed.' });
    const key = `${edge.sourceNodeId}|${edge.targetNodeId}|${edge.sourcePortId ?? ''}|${edge.targetPortId ?? ''}`;
    if (connections.has(key)) errors.push({ targetType: 'edge', targetId: edge.id, code: 'DUPLICATE_EDGE', message: 'Duplicate connections are not allowed.' });
    connections.add(key);
  }
  return { valid: errors.length === 0, errors };
}

export interface NetworkValidationService {
  validate(graph: GraphDocument): Promise<GraphValidationResult>;
}

export function createMockNetworkValidationService(errors: readonly GraphValidationError[] = []): NetworkValidationService {
  return { validate: async () => ({ valid: errors.length === 0, errors }) };
}
