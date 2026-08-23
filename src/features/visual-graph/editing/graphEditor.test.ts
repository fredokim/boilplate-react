import { describe, expect, it } from 'vitest';
import type { GraphEdge, GraphNode } from '../model/graph';
import { networkGraph, type NetworkEdgeMetadata, type NetworkNodeMetadata, type NetworkNodeType } from '../network/networkGraph';
import { addEdge, addNode, moveNode, removeNode, updateNode } from './graphCommands';
import { applyGraphCommand, beginGraphEdit, cancelGraphEdit, createGraphEditorSession, saveGraphEdit } from './graphEditorSession';
import { validateGraphStructure } from './graphValidation';

function requireDraft<T>(draft: T | null): T {
  if (!draft) throw new Error('Expected an active draft.');
  return draft;
}

const newNode: GraphNode<NetworkNodeType, NetworkNodeMetadata> = {
  id: 'router-new', type: 'router', label: 'New Router', position: { x: 10, y: 20 },
  metadata: { hostname: 'router-new', ipAddress: 'Unassigned', status: 'healthy', location: 'Lab' },
};

const newEdge: GraphEdge<NetworkEdgeMetadata> = {
  id: 'new-edge', sourceNodeId: 'core-router', targetNodeId: 'api-server', sourcePortId: 'output', targetPortId: 'input',
  metadata: { protocol: 'TLS', bandwidthMbps: 1000, interface: 'eth0', status: 'up' },
};

describe('graph editor domain', () => {
  it('adds a node to the draft only and cancel restores the saved graph', () => {
    const editing = beginGraphEdit(createGraphEditorSession(networkGraph));
    const changed = applyGraphCommand(editing, addNode(requireDraft(editing.draftGraph), newNode));
    expect(changed.draftGraph?.nodes).toHaveLength(networkGraph.nodes.length + 1);
    expect(changed.savedGraph.nodes).toHaveLength(networkGraph.nodes.length);
    expect(cancelGraphEdit(changed).savedGraph).toBe(networkGraph);
  });

  it('moves draft nodes, preserves saved positions, and commits on save', () => {
    const editing = beginGraphEdit(createGraphEditorSession(networkGraph));
    const moved = applyGraphCommand(editing, moveNode(requireDraft(editing.draftGraph), 'core-router', { x: 999, y: 888 }));
    expect(moved.savedGraph.nodes[0]?.position).toEqual({ x: 40, y: 150 });
    expect(moved.draftGraph?.nodes[0]?.position).toEqual({ x: 999, y: 888 });
    const saved = saveGraphEdit(moved);
    expect(saved.savedGraph.nodes[0]?.position).toEqual({ x: 999, y: 888 });
    expect(saved.dirty).toBe(false);
  });

  it('removes a node and its connected edges while cancel restores both', () => {
    const editing = beginGraphEdit(createGraphEditorSession(networkGraph));
    const removed = applyGraphCommand(editing, removeNode(requireDraft(editing.draftGraph), 'edge-firewall'));
    expect(removed.draftGraph?.nodes.some((node) => node.id === 'edge-firewall')).toBe(false);
    expect(removed.draftGraph?.edges).toHaveLength(0);
    const cancelled = cancelGraphEdit(removed);
    expect(cancelled.savedGraph.nodes.some((node) => node.id === 'edge-firewall')).toBe(true);
    expect(cancelled.savedGraph.edges).toHaveLength(3);
  });

  it('adds valid connections and rejects duplicate and self edges', () => {
    const added = addEdge(networkGraph, newEdge);
    expect(added.changed).toBe(true);
    expect(addEdge(added.graph, { ...newEdge, id: 'duplicate' }).error).toMatch(/already exists/);
    expect(addEdge(networkGraph, { ...newEdge, id: 'self', sourceNodeId: 'core-router', targetNodeId: 'core-router' }).error).toMatch(/itself/);
  });

  it('restores metadata on cancel and tracks dirty only after mutations', () => {
    const editing = beginGraphEdit(createGraphEditorSession(networkGraph));
    expect(editing.dirty).toBe(false);
    const updated = applyGraphCommand(editing, updateNode(requireDraft(editing.draftGraph), 'api-server', { label: 'Renamed API' }));
    expect(updated.dirty).toBe(true);
    expect(cancelGraphEdit(updated).savedGraph.nodes.find((node) => node.id === 'api-server')?.label).toBe('API Server');
  });

  it('reports invalid edges without storing errors in graph data', () => {
    const invalidGraph = { ...networkGraph, edges: [...networkGraph.edges, { ...newEdge, id: 'invalid', targetNodeId: 'missing' }] };
    const result = validateGraphStructure(invalidGraph);
    expect(result.errors).toEqual(expect.arrayContaining([expect.objectContaining({ targetId: 'invalid', code: 'MISSING_TARGET' })]));
    expect('validationErrors' in invalidGraph).toBe(false);
  });
});
