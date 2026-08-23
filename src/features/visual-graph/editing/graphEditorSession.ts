import type { GraphDocument, GraphMetadata } from '../model/graph';
import type { GraphCommandResult } from './graphCommands';

export type GraphEditorSession<TGraph> = {
  savedGraph: TGraph;
  draftGraph: TGraph | null;
  editMode: boolean;
  dirty: boolean;
  past: readonly TGraph[];
  future: readonly TGraph[];
};

export const GRAPH_HISTORY_LIMIT = 50;

export function createGraphEditorSession<TGraph>(savedGraph: TGraph): GraphEditorSession<TGraph> {
  return { savedGraph, draftGraph: null, editMode: false, dirty: false, past: [], future: [] };
}

export function beginGraphEdit<TNodeType extends string, TNodeMetadata extends GraphMetadata, TEdgeMetadata extends GraphMetadata>(
  session: GraphEditorSession<GraphDocument<TNodeType, TNodeMetadata, TEdgeMetadata>>,
) {
  return { ...session, draftGraph: cloneGraph(session.savedGraph), editMode: true, dirty: false, past: [], future: [] };
}

export function applyGraphCommand<TGraph>(session: GraphEditorSession<TGraph>, result: GraphCommandResult<TGraph>) {
  if (!result.changed || !session.draftGraph) return session;
  return { ...session, draftGraph: result.graph, dirty: true, past: [...session.past, session.draftGraph].slice(-GRAPH_HISTORY_LIMIT), future: [] };
}

export function undoGraphEdit<TGraph>(session: GraphEditorSession<TGraph>) {
  const previous = session.past.at(-1);
  if (!previous || !session.draftGraph) return session;
  return { ...session, draftGraph: previous, past: session.past.slice(0, -1), future: [session.draftGraph, ...session.future], dirty: session.past.length > 1 };
}

export function redoGraphEdit<TGraph>(session: GraphEditorSession<TGraph>) {
  const next = session.future[0];
  if (!next || !session.draftGraph) return session;
  return { ...session, draftGraph: next, past: [...session.past, session.draftGraph].slice(-GRAPH_HISTORY_LIMIT), future: session.future.slice(1), dirty: true };
}

export function saveGraphEdit<TGraph>(session: GraphEditorSession<TGraph>) {
  if (!session.draftGraph) return session;
  return { savedGraph: session.draftGraph, draftGraph: null, editMode: false, dirty: false, past: [], future: [] };
}

export function cancelGraphEdit<TGraph>(session: GraphEditorSession<TGraph>) {
  return { ...session, draftGraph: null, editMode: false, dirty: false, past: [], future: [] };
}

function cloneGraph<TNodeType extends string, TNodeMetadata extends GraphMetadata, TEdgeMetadata extends GraphMetadata>(
  graph: GraphDocument<TNodeType, TNodeMetadata, TEdgeMetadata>,
) {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => ({ ...node, position: { ...node.position }, metadata: { ...node.metadata } })),
    edges: graph.edges.map((edge) => ({ ...edge, metadata: { ...edge.metadata } })),
  };
}
