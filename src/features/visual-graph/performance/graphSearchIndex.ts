import type { GraphDocument, GraphMetadata } from '../model/graph';

export type GraphSearchIndex = ReadonlyMap<string, string>;

export function createGraphSearchIndex<T extends string, N extends GraphMetadata, E extends GraphMetadata>(graph: GraphDocument<T, N, E>): GraphSearchIndex {
  return new Map(graph.nodes.map((node) => [node.id, [node.id, node.label, node.type, ...Object.values(node.metadata).filter((value) => typeof value === 'string' || typeof value === 'number')].join(' ').toLocaleLowerCase()]));
}

export function searchGraphIndex(index: GraphSearchIndex, query: string) {
  const normalized = query.trim().toLocaleLowerCase(); if (!normalized) return [];
  return [...index].filter(([, text]) => text.includes(normalized)).map(([id]) => id);
}
