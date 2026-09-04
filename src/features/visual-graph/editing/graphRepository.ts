import type { GraphDocument } from '../model/graph';

export interface GraphRepository<TGraph extends GraphDocument = GraphDocument> {
  load(): Promise<TGraph>;
  save(graph: TGraph): Promise<void>;
}

export function createMemoryGraphRepository<TGraph extends GraphDocument>(initialGraph: TGraph): GraphRepository<TGraph> {
  let storedGraph = initialGraph;
  return {
    load: async () => storedGraph,
    save: async (graph) => { storedGraph = graph; },
  };
}
