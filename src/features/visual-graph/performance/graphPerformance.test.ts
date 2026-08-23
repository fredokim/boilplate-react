import { describe, expect, it } from 'vitest';
import { moveNode } from '../editing/graphCommands';
import { applyGraphCommand, beginGraphEdit, createGraphEditorSession, GRAPH_HISTORY_LIMIT, type GraphEditorSession } from '../editing/graphEditorSession';
import { exportGraph, importGraph } from '../editing/graphSerialization';
import { createLayoutCoordinator } from '../layout/layoutCoordinator';
import { createDeterministicGraph } from './largeGraphFixture';
import { createGraphSearchIndex, searchGraphIndex } from './graphSearchIndex';
import { createRouteLookup, getGraphDetailLevel } from './graphViewAdapter';

describe('large graph performance contracts', () => {
  it('preserves unaffected node references during position updates', () => {
    const graph = createDeterministicGraph(50); const updated = moveNode(graph, 'perf-node-0', { x: 1, y: 2 }).graph;
    expect(updated.nodes[1]).toBe(graph.nodes[1]);
  });
  it('creates accurate route sets and LOD levels', () => {
    const lookup = createRouteLookup({ id: 'r', sourceNodeId: 'a', destinationNodeId: 'b', nodeIds: ['a', 'b'], edgeIds: ['e'] });
    expect(lookup.nodeIds.has('b')).toBe(true); expect(lookup.edgeIds.has('x')).toBe(false);
    expect(getGraphDetailLevel(0.5)).toBe('compact'); expect(getGraphDetailLevel(1.5)).toBe('detailed');
  });
  it('indexes id, name, type and updated metadata', () => {
    const graph = createDeterministicGraph(50); expect(searchGraphIndex(createGraphSearchIndex(graph), 'host-12')).toEqual(['perf-node-12']);
    const updated = { ...graph, nodes: graph.nodes.map((node) => node.id === 'perf-node-12' ? { ...node, metadata: { ...node.metadata, hostname: 'renamed-host' } } : node) };
    expect(searchGraphIndex(createGraphSearchIndex(updated), 'renamed-host')).toEqual(['perf-node-12']);
  });
  it('ignores stale layout results and surfaces worker failures', async () => {
    const resolvers: ((value: Record<string, { x: number; y: number }>) => void)[] = [];
    const coordinator = createLayoutCoordinator(() => new Promise((resolve) => resolvers.push(resolve)));
    const graph = createDeterministicGraph(50); const first = coordinator.layout(graph); const second = coordinator.layout(graph);
    resolvers[1]?.({}); expect((await second).status).toBe('applied'); resolvers[0]?.({}); expect((await first).status).toBe('stale');
    expect((await createLayoutCoordinator(async () => { throw new Error('worker failed'); }).layout(graph)).status).toBe('error');
  });
  it('round trips a 2,000-node graph', () => {
    const graph = createDeterministicGraph(2000); const imported = importGraph(exportGraph(graph));
    expect(imported.success && imported.graph.nodes.length).toBe(2000); expect(imported.success && imported.graph.edges.length).toBe(3998);
  });
  it('caps snapshot history', () => {
    const graph = createDeterministicGraph(50); let session: GraphEditorSession<typeof graph> = beginGraphEdit(createGraphEditorSession(graph));
    for (let index = 0; index < GRAPH_HISTORY_LIMIT + 5; index += 1) { const current = session.draftGraph; if (!current) throw new Error('Missing draft'); session = applyGraphCommand(session, moveNode(current, 'perf-node-0', { x: index + 1, y: 0 })); }
    expect(session.past).toHaveLength(GRAPH_HISTORY_LIMIT);
  });
});
