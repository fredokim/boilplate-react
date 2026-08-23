import { describe, expect, it } from 'vitest';
import type { GraphDocument, GraphRoute } from './graph';
import { findGraphNodes, getGraphEdgeVisualState, getGraphNodeVisualState, type GraphInteractionState } from './graphInteraction';

const route: GraphRoute = {
  id: 'route-a-c',
  sourceNodeId: 'a',
  destinationNodeId: 'c',
  nodeIds: ['a', 'b', 'c'],
  edgeIds: ['a-b', 'b-c'],
};

const interaction: GraphInteractionState = {
  activeRoute: route,
  destinationNodeId: 'c',
  hoveredEdgeId: null,
  hoveredNodeId: null,
  selection: { nodeIds: ['b'], edgeIds: [], groupIds: [] },
  sourceNodeId: 'a',
};

describe('graph interaction contracts', () => {
  it('maps ordered route ids to active node and edge states while preserving selection', () => {
    expect(getGraphNodeVisualState('a', interaction)).toMatchObject({ routeRole: 'source', dimmed: false });
    expect(getGraphNodeVisualState('b', interaction)).toMatchObject({ routeRole: 'path', selected: true, dimmed: false });
    expect(getGraphNodeVisualState('c', interaction)).toMatchObject({ routeRole: 'destination', dimmed: false });
    expect(getGraphEdgeVisualState('a-b', interaction)).toMatchObject({ routeActive: true, dimmed: false });
  });

  it('marks non-route graph elements without mutating the graph document', () => {
    expect(getGraphNodeVisualState('outside', interaction).dimmed).toBe(true);
    expect(getGraphEdgeVisualState('outside-edge', interaction).dimmed).toBe(true);
    expect(route.nodeIds).toEqual(['a', 'b', 'c']);
  });

  it('searches a generic graph without network-specific metadata', () => {
    const graph: GraphDocument<'custom', { owner: string }, { weight: number }> = {
      nodes: [{ id: 'generic-1', label: 'Generic node', type: 'custom', position: { x: 0, y: 0 }, metadata: { owner: 'Platform' } }],
      edges: [],
    };
    expect(findGraphNodes(graph, 'platform').map((node) => node.id)).toEqual(['generic-1']);
  });
});
