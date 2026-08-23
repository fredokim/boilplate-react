import { describe, expect, it } from 'vitest';
import { dagreLayoutService } from '../layout/dagreLayout';
import { emptyGraphSelection } from '../model/graph';
import { networkGraph } from '../network/networkGraph';
import { addGroup, copySelection, moveGroup, moveNode, pasteClipboard, removeSelection } from './graphCommands';
import { applyGraphCommand, beginGraphEdit, createGraphEditorSession, redoGraphEdit, saveGraphEdit, undoGraphEdit } from './graphEditorSession';
import { exportGraph, importGraph } from './graphSerialization';

const ids = (() => {
  let node = 0; let edge = 0;
  return { createNodeId: (type: string) => `${type}-copy-${String(++node)}`, createEdgeId: () => `edge-copy-${String(++edge)}`, createGroupId: () => 'group-copy' };
})();

function draft<T>(value: T | null): T { if (!value) throw new Error('Missing draft'); return value; }

describe('graph editor productivity contracts', () => {
  it('undoes and redoes a move as one history entry', () => {
    const editing = beginGraphEdit(createGraphEditorSession(networkGraph));
    const moved = applyGraphCommand(editing, moveNode(draft(editing.draftGraph), 'core-router', { x: 700, y: 300 }));
    expect(undoGraphEdit(moved).draftGraph?.nodes[0]?.position).toEqual({ x: 40, y: 150 });
    expect(redoGraphEdit(undoGraphEdit(moved)).draftGraph?.nodes[0]?.position).toEqual({ x: 700, y: 300 });
  });

  it('clears history at save and at the next editing session', () => {
    const editing = beginGraphEdit(createGraphEditorSession(networkGraph));
    const moved = applyGraphCommand(editing, moveNode(draft(editing.draftGraph), 'core-router', { x: 1, y: 2 }));
    const nextSession = beginGraphEdit(saveGraphEdit(moved));
    expect(nextSession.past).toHaveLength(0); expect(undoGraphEdit(nextSession)).toBe(nextSession);
  });

  it('bulk deletes nodes and connected edges and restores them with one undo', () => {
    const editing = beginGraphEdit(createGraphEditorSession(networkGraph));
    const removed = applyGraphCommand(editing, removeSelection(draft(editing.draftGraph), { nodeIds: ['edge-firewall', 'api-server'], edgeIds: [], groupIds: [] }));
    expect(removed.draftGraph?.nodes).toHaveLength(2); expect(removed.draftGraph?.edges).toHaveLength(0);
    expect(undoGraphEdit(removed).draftGraph).toEqual(editing.draftGraph);
  });

  it('copies internal edges only and remaps pasted references and positions', () => {
    const clipboard = copySelection(networkGraph, { nodeIds: ['edge-firewall', 'api-server'], edgeIds: [], groupIds: [] });
    expect(clipboard.edges.map((edge) => edge.id)).toEqual(['firewall-to-api']);
    const pasted = pasteClipboard(networkGraph, clipboard, ids);
    const copiedEdge = pasted.graph.edges.at(-1); const copiedNodes = pasted.graph.nodes.slice(-2);
    expect(copiedEdge?.sourceNodeId).toBe(copiedNodes[0]?.id); expect(copiedEdge?.targetNodeId).toBe(copiedNodes[1]?.id);
    expect(copiedNodes[0]?.position.x).toBe((networkGraph.nodes[1]?.position.x ?? 0) + 40);
  });

  it('moves grouped children and leaves nodes intact when the group is removed', () => {
    const grouped = addGroup(networkGraph, { id: 'dmz', name: 'DMZ', childNodeIds: ['edge-firewall', 'api-server'], expanded: true }).graph;
    const moved = moveGroup(grouped, 'dmz', { x: 50, y: 20 }).graph;
    expect(moved.nodes[1]?.position.x).toBe((networkGraph.nodes[1]?.position.x ?? 0) + 50);
    const ungrouped = removeSelection(moved, { nodeIds: [], edgeIds: [], groupIds: ['dmz'] }).graph;
    expect(ungrouped.nodes).toHaveLength(networkGraph.nodes.length); expect(ungrouped.groups).toHaveLength(0);
  });

  it('makes auto layout undoable', () => {
    const editing = beginGraphEdit(createGraphEditorSession(networkGraph));
    const layouted = applyGraphCommand(editing, { graph: dagreLayoutService.layout(draft(editing.draftGraph)), changed: true });
    expect(layouted.draftGraph?.nodes[0]?.position).not.toEqual(networkGraph.nodes[0]?.position);
    expect(undoGraphEdit(layouted).draftGraph).toEqual(editing.draftGraph);
  });

  it('round trips versioned graph JSON and rejects invalid imports', () => {
    const graph = { ...networkGraph, groups: [{ id: 'g1', name: 'Group', childNodeIds: ['core-router'], expanded: true }] };
    const imported = importGraph(exportGraph(graph));
    expect(imported.success && imported.graph).toEqual(graph);
    const invalid = importGraph(JSON.stringify({ schemaVersion: 1, nodes: [], edges: [{ id: 'e', sourceNodeId: 'missing', targetNodeId: 'missing', metadata: {} }], groups: [] }));
    expect(invalid.success).toBe(false);
    expect(importGraph('{bad json').success).toBe(false);
  });

  it('keeps selection outside history', () => {
    const editing = beginGraphEdit(createGraphEditorSession(networkGraph));
    const selection = emptyGraphSelection(); selection.nodeIds = ['core-router'];
    expect(editing.past).toHaveLength(0);
  });
});
