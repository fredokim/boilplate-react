import type { GraphDocument, GraphEdge, GraphGroup, GraphMetadata, GraphNode, GraphPosition, GraphSelection } from '../model/graph';

export type GraphCommandResult<TGraph> = { graph: TGraph; changed: boolean; error?: string };

export function addNode<TNodeType extends string, TNodeMetadata extends GraphMetadata, TEdgeMetadata extends GraphMetadata>(
  graph: GraphDocument<TNodeType, TNodeMetadata, TEdgeMetadata>,
  node: GraphNode<TNodeType, TNodeMetadata>,
): GraphCommandResult<typeof graph> {
  if (graph.nodes.some((candidate) => candidate.id === node.id)) return { graph, changed: false, error: `Node ${node.id} already exists.` };
  return { graph: { ...graph, nodes: [...graph.nodes, node] }, changed: true };
}

export function removeNode<TNodeType extends string, TNodeMetadata extends GraphMetadata, TEdgeMetadata extends GraphMetadata>(
  graph: GraphDocument<TNodeType, TNodeMetadata, TEdgeMetadata>, nodeId: string,
): GraphCommandResult<typeof graph> {
  if (!graph.nodes.some((node) => node.id === nodeId)) return { graph, changed: false };
  return {
    graph: {
      ...graph,
      nodes: graph.nodes.filter((node) => node.id !== nodeId),
      edges: graph.edges.filter((edge) => edge.sourceNodeId !== nodeId && edge.targetNodeId !== nodeId),
    },
    changed: true,
  };
}

export function moveNode<TNodeType extends string, TNodeMetadata extends GraphMetadata, TEdgeMetadata extends GraphMetadata>(
  graph: GraphDocument<TNodeType, TNodeMetadata, TEdgeMetadata>, nodeId: string, position: GraphPosition,
): GraphCommandResult<typeof graph> {
  const node = graph.nodes.find((candidate) => candidate.id === nodeId);
  if (!node || (node.position.x === position.x && node.position.y === position.y)) return { graph, changed: false };
  return { graph: { ...graph, nodes: graph.nodes.map((candidate) => candidate.id === nodeId ? { ...candidate, position } : candidate) }, changed: true };
}

export function updateNode<TNodeType extends string, TNodeMetadata extends GraphMetadata, TEdgeMetadata extends GraphMetadata>(
  graph: GraphDocument<TNodeType, TNodeMetadata, TEdgeMetadata>, nodeId: string,
  update: Partial<Pick<GraphNode<TNodeType, TNodeMetadata>, 'label' | 'metadata'>>,
): GraphCommandResult<typeof graph> {
  if (!graph.nodes.some((node) => node.id === nodeId)) return { graph, changed: false };
  return { graph: { ...graph, nodes: graph.nodes.map((node) => node.id === nodeId ? { ...node, ...update } : node) }, changed: true };
}

export function addEdge<TNodeType extends string, TNodeMetadata extends GraphMetadata, TEdgeMetadata extends GraphMetadata>(
  graph: GraphDocument<TNodeType, TNodeMetadata, TEdgeMetadata>, edge: GraphEdge<TEdgeMetadata>,
): GraphCommandResult<typeof graph> {
  if (edge.sourceNodeId === edge.targetNodeId) return { graph, changed: false, error: 'A node cannot connect to itself.' };
  if (!graph.nodes.some((node) => node.id === edge.sourceNodeId) || !graph.nodes.some((node) => node.id === edge.targetNodeId)) return { graph, changed: false, error: 'Both edge endpoints must exist.' };
  if (graph.edges.some((candidate) => candidate.sourceNodeId === edge.sourceNodeId && candidate.targetNodeId === edge.targetNodeId && candidate.sourcePortId === edge.sourcePortId && candidate.targetPortId === edge.targetPortId)) return { graph, changed: false, error: 'This connection already exists.' };
  return { graph: { ...graph, edges: [...graph.edges, edge] }, changed: true };
}

export function removeEdge<TNodeType extends string, TNodeMetadata extends GraphMetadata, TEdgeMetadata extends GraphMetadata>(
  graph: GraphDocument<TNodeType, TNodeMetadata, TEdgeMetadata>, edgeId: string,
): GraphCommandResult<typeof graph> {
  if (!graph.edges.some((edge) => edge.id === edgeId)) return { graph, changed: false };
  return { graph: { ...graph, edges: graph.edges.filter((edge) => edge.id !== edgeId) }, changed: true };
}

export function removeSelection<TNodeType extends string, TNodeMetadata extends GraphMetadata, TEdgeMetadata extends GraphMetadata>(graph: GraphDocument<TNodeType, TNodeMetadata, TEdgeMetadata>, selection: GraphSelection): GraphCommandResult<typeof graph> {
  const nodeIds = new Set(selection.nodeIds); const edgeIds = new Set(selection.edgeIds); const groupIds = new Set(selection.groupIds);
  const nodes = graph.nodes.filter((node) => !nodeIds.has(node.id));
  const edges = graph.edges.filter((edge) => !edgeIds.has(edge.id) && !nodeIds.has(edge.sourceNodeId) && !nodeIds.has(edge.targetNodeId));
  const groups = graph.groups?.filter((group) => !groupIds.has(group.id)).map((group) => ({ ...group, childNodeIds: group.childNodeIds.filter((id) => !nodeIds.has(id)) }));
  const changed = nodes.length !== graph.nodes.length || edges.length !== graph.edges.length || groups?.length !== graph.groups?.length;
  return { graph: { ...graph, nodes, edges, ...(groups ? { groups } : {}) }, changed };
}

export type GraphClipboard<TNodeType extends string, TNodeMetadata extends GraphMetadata, TEdgeMetadata extends GraphMetadata> = { nodes: readonly GraphNode<TNodeType, TNodeMetadata>[]; edges: readonly GraphEdge<TEdgeMetadata>[] };

export function copySelection<TNodeType extends string, TNodeMetadata extends GraphMetadata, TEdgeMetadata extends GraphMetadata>(graph: GraphDocument<TNodeType, TNodeMetadata, TEdgeMetadata>, selection: GraphSelection): GraphClipboard<TNodeType, TNodeMetadata, TEdgeMetadata> {
  const ids = new Set(selection.nodeIds);
  return { nodes: graph.nodes.filter((node) => ids.has(node.id)), edges: graph.edges.filter((edge) => ids.has(edge.sourceNodeId) && ids.has(edge.targetNodeId)) };
}

export function pasteClipboard<TNodeType extends string, TNodeMetadata extends GraphMetadata, TEdgeMetadata extends GraphMetadata>(graph: GraphDocument<TNodeType, TNodeMetadata, TEdgeMetadata>, clipboard: GraphClipboard<TNodeType, TNodeMetadata, TEdgeMetadata>, ids: { createNodeId(type: string): string; createEdgeId(): string }, offset = 40): GraphCommandResult<typeof graph> & { selection: GraphSelection } {
  const remap = new Map(clipboard.nodes.map((node) => [node.id, ids.createNodeId(node.type)]));
  const nodes = clipboard.nodes.map((node) => ({ ...node, id: remap.get(node.id) ?? node.id, position: { x: node.position.x + offset, y: node.position.y + offset }, metadata: { ...node.metadata } }));
  const edges = clipboard.edges.map((edge) => ({ ...edge, id: ids.createEdgeId(), sourceNodeId: remap.get(edge.sourceNodeId) ?? edge.sourceNodeId, targetNodeId: remap.get(edge.targetNodeId) ?? edge.targetNodeId, metadata: { ...edge.metadata } }));
  return { graph: { ...graph, nodes: [...graph.nodes, ...nodes], edges: [...graph.edges, ...edges] }, changed: nodes.length > 0, selection: { nodeIds: nodes.map((node) => node.id), edgeIds: edges.map((edge) => edge.id), groupIds: [] } };
}

export function addGroup<TNodeType extends string, TNodeMetadata extends GraphMetadata, TEdgeMetadata extends GraphMetadata>(graph: GraphDocument<TNodeType, TNodeMetadata, TEdgeMetadata>, group: GraphGroup): GraphCommandResult<typeof graph> {
  if (graph.groups?.some((candidate) => candidate.id === group.id)) return { graph, changed: false, error: 'Group id already exists.' };
  return { graph: { ...graph, groups: [...(graph.groups ?? []), group] }, changed: true };
}

export function moveGroup<TNodeType extends string, TNodeMetadata extends GraphMetadata, TEdgeMetadata extends GraphMetadata>(graph: GraphDocument<TNodeType, TNodeMetadata, TEdgeMetadata>, groupId: string, delta: GraphPosition): GraphCommandResult<typeof graph> {
  const group = graph.groups?.find((candidate) => candidate.id === groupId); if (!group) return { graph, changed: false };
  const ids = new Set(group.childNodeIds);
  return { graph: { ...graph, nodes: graph.nodes.map((node) => ids.has(node.id) ? { ...node, position: { x: node.position.x + delta.x, y: node.position.y + delta.y } } : node) }, changed: true };
}

export function moveSelection<TNodeType extends string, TNodeMetadata extends GraphMetadata, TEdgeMetadata extends GraphMetadata>(graph: GraphDocument<TNodeType, TNodeMetadata, TEdgeMetadata>, draggedNodeId: string, position: GraphPosition, selection: GraphSelection): GraphCommandResult<typeof graph> {
  const dragged = graph.nodes.find((node) => node.id === draggedNodeId); if (!dragged) return { graph, changed: false };
  const selected = new Set(selection.nodeIds.includes(draggedNodeId) ? selection.nodeIds : [draggedNodeId]);
  const delta = { x: position.x - dragged.position.x, y: position.y - dragged.position.y };
  if (!delta.x && !delta.y) return { graph, changed: false };
  return { graph: { ...graph, nodes: graph.nodes.map((node) => selected.has(node.id) ? { ...node, position: { x: node.position.x + delta.x, y: node.position.y + delta.y } } : node) }, changed: true };
}
