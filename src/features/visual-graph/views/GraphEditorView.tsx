import { useState } from 'react';
import type { Connection } from '@xyflow/react';
import { Button } from '@ui/Button';
import { Card } from '@ui/Card';
import { Input } from '@ui/Input';
import { emptyGraphSelection, type GraphPosition, type GraphSelection } from '../model/graph';
import type { GraphInteractionState } from '../model/graphInteraction';
import type { GraphValidationError } from '../editing/graphValidation';
import { GraphCanvas } from '../components/GraphCanvas';
import { getNetworkNodePresentation, type NetworkEdgeMetadata, type NetworkNodeMetadata, type NetworkNodeType } from '../network/networkGraph';
import type { GraphDocument } from '../model/graph';
import { useGraphEditorShortcuts } from '../editing/useGraphEditorShortcuts';

type GraphEditorViewProps = {
  graph: GraphDocument<NetworkNodeType, NetworkNodeMetadata, NetworkEdgeMetadata>;
  interaction: GraphInteractionState;
  dirty: boolean;
  paletteType: NetworkNodeType | null;
  validationErrors: readonly GraphValidationError[];
  saving: boolean;
  onPaletteChange: (type: NetworkNodeType | null) => void;
  onCanvasAdd: (position: GraphPosition) => void;
  onNodeMove: (nodeId: string, position: GraphPosition) => void;
  onConnect: (connection: Connection) => void;
  onSelectionChange: (selection: GraphSelection) => void;
  onUpdateNode: (nodeId: string, label: string, description: string) => void;
  onDeleteSelection: () => void;
  onValidate: () => void;
  onSave: () => void;
  onCancel: () => void;
  canUndo: boolean; canRedo: boolean;
  onUndo: () => void; onRedo: () => void; onCopy: () => void; onPaste: () => void; onDuplicate: () => void;
  onGroup: () => void; onAutoLayout: () => void; onExport: () => string; onImport: (json: string) => void;
  onMoveGroup: (groupId: string) => void;
  debug: { historyEntries: number; layoutTimeMs: number };
};

export function GraphEditorView({
  canRedo, canUndo, debug, dirty, graph, interaction, onAutoLayout, onCancel, onCanvasAdd, onConnect, onCopy, onDeleteSelection, onDuplicate, onExport, onGroup, onImport, onNodeMove, onPaletteChange, onPaste, onRedo,
  onMoveGroup, onSave, onSelectionChange, onUndo, onUpdateNode, onValidate, paletteType, saving, validationErrors,
}: GraphEditorViewProps) {
  const selectedNode = graph.nodes.find((node) => node.id === interaction.selection.nodeIds[0]);
  const selectedEdge = graph.edges.find((edge) => edge.id === interaction.selection.edgeIds[0]);
  const [transferJson, setTransferJson] = useState('');
  const [canvasDebug, setCanvasDebug] = useState({ renderCount: 0, zoom: 1 });
  useGraphEditorShortcuts({ undo: onUndo, redo: onRedo, copy: onCopy, paste: onPaste, duplicate: onDuplicate, remove: onDeleteSelection, clearSelection: () => onSelectionChange(emptyGraphSelection()) });

  return (
    <div className="page-grid">
      <div className="page-heading">
        <div>
          <h1 className="m-0 text-2xl font-black text-ink">Topology Editor</h1>
          <p className="mt-2 text-sm text-muted">Build a draft topology. Routing and network policy validation remain external responsibilities.</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">Unsaved changes</span> : null}
          <Button onClick={onValidate} variant="secondary">Validate</Button>
          <Button disabled={!dirty} isLoading={saving} onClick={onSave}>Save</Button>
          <Button onClick={onCancel} variant="ghost">Cancel</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button disabled={!canUndo} onClick={onUndo} size="sm" variant="secondary">Undo</Button>
        <Button disabled={!canRedo} onClick={onRedo} size="sm" variant="secondary">Redo</Button>
        <Button onClick={onCopy} size="sm" variant="secondary">Copy</Button>
        <Button onClick={onPaste} size="sm" variant="secondary">Paste</Button>
        <Button onClick={onDuplicate} size="sm" variant="secondary">Duplicate</Button>
        <Button onClick={onGroup} size="sm" variant="secondary">Group</Button>
        <Button onClick={onAutoLayout} size="sm" variant="secondary">Auto layout</Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)_300px]">
        <Card title="Device palette" description="Choose a type, then click the canvas.">
          <div className="grid gap-2">
            {(['router', 'firewall', 'server'] as const).map((type) => {
              const presentation = getNetworkNodePresentation(type);
              return (
                <button className={`flex items-center gap-3 rounded-md border p-3 text-left ${paletteType === type ? 'border-primary bg-blue-50' : 'border-line bg-white'}`} key={type} onClick={() => onPaletteChange(paletteType === type ? null : type)} type="button">
                  <span className="grid h-9 w-9 place-items-center rounded-md text-sm font-black text-white" style={{ backgroundColor: presentation.color }}>{presentation.icon}</span>
                  <strong className="text-sm text-ink">{presentation.typeLabel}</strong>
                </button>
              );
            })}
          </div>
          <p className="mb-0 mt-4 text-xs text-muted">Drag nodes to move them. Drag from a node handle to another node to connect.</p>
          {graph.groups?.length ? <div className="mt-4 grid gap-2 border-t border-line pt-4"><strong className="text-xs text-muted">Groups</strong>{graph.groups.map((group) => <button className="rounded-md border border-line p-2 text-left text-sm" key={group.id} onClick={() => onSelectionChange({ nodeIds: [], edgeIds: [], groupIds: [group.id] })} type="button">{group.name} · {group.childNodeIds.length}</button>)}</div> : null}
        </Card>

        <GraphCanvas
          editable
          getNodePresentation={getNetworkNodePresentation}
          graph={graph}
          interaction={interaction}
          onCanvasClick={(position) => {
            if (!paletteType) return false;
            onCanvasAdd(position);
            return true;
          }}
          onConnect={onConnect}
          onEdgeHover={() => undefined}
          onEdgeSelect={(id) => onSelectionChange({ nodeIds: [], edgeIds: [id], groupIds: [] })}
          onNodeHover={() => undefined}
          onNodeMove={onNodeMove}
          onMultiSelectionChange={(nodeIds, edgeIds) => onSelectionChange({ nodeIds, edgeIds, groupIds: [] })}
          onDebugChange={setCanvasDebug}
          onNodeSelect={(id) => onSelectionChange(id ? { nodeIds: [id], edgeIds: [], groupIds: [] } : emptyGraphSelection())}
          validationErrors={validationErrors}
        />

        <div className="grid content-start gap-5">
          <Card title="Selection" description="Edit node metadata or remove the selected element.">
            {selectedNode ? (
              <NodeMetadataEditor key={selectedNode.id} node={selectedNode} onDelete={onDeleteSelection} onUpdate={onUpdateNode} />
            ) : selectedEdge ? (
              <div className="grid gap-3 text-sm">
                <p className="m-0 text-ink">{selectedEdge.sourceNodeId} → {selectedEdge.targetNodeId}</p>
                <p className="m-0 text-xs text-muted">{selectedEdge.sourcePortId ?? 'default'} → {selectedEdge.targetPortId ?? 'default'}</p>
                <Button onClick={onDeleteSelection} variant="danger">Delete edge</Button>
              </div>
            ) : interaction.selection.groupIds[0] ? <div className="grid gap-2"><p className="m-0 text-sm text-ink">{graph.groups?.find((group) => group.id === interaction.selection.groupIds[0])?.name}</p><Button onClick={() => onMoveGroup(interaction.selection.groupIds[0] ?? '')} variant="secondary">Move group +40</Button><Button onClick={onDeleteSelection} variant="danger">Ungroup</Button></div> : <p className="m-0 text-sm text-muted">Select a node, edge, or group.</p>}
          </Card>
          <Card title="Validation" description="Structural checks plus external validation results.">
            {validationErrors.length ? (
              <ul className="m-0 grid gap-2 pl-5 text-sm text-danger">
                {validationErrors.map((error) => <li key={`${error.code}-${error.targetId}`}>{error.message} ({error.targetId})</li>)}
              </ul>
            ) : <p className="m-0 text-sm text-muted">No validation errors.</p>}
          </Card>
          <Card title="Import / Export" description="Versioned graph JSON. Import stays in draft until Save.">
            <div className="grid gap-2">
              <textarea className="min-h-32 rounded-md border border-line p-2 text-xs" onChange={(event) => setTransferJson(event.target.value)} value={transferJson} />
              <div className="flex gap-2"><Button onClick={() => setTransferJson(onExport())} size="sm" variant="secondary">Export JSON</Button><Button disabled={!transferJson.trim()} onClick={() => onImport(transferJson)} size="sm">Import preview</Button></div>
            </div>
          </Card>
          <Card title="Performance debug" description="Development baseline signals."><dl className="m-0 grid grid-cols-2 gap-2 text-xs"><dt>Nodes</dt><dd>{graph.nodes.length}</dd><dt>Edges</dt><dd>{graph.edges.length}</dd><dt>Viewport</dt><dd>{graph.nodes.length >= 500 ? 'culled' : 'all'}</dd><dt>Zoom</dt><dd>{canvasDebug.zoom.toFixed(2)}</dd><dt>Canvas renders</dt><dd>{canvasDebug.renderCount}</dd><dt>History</dt><dd>{debug.historyEntries}</dd><dt>Layout</dt><dd>{debug.layoutTimeMs.toFixed(1)} ms</dd></dl></Card>
        </div>
      </div>
    </div>
  );
}

function NodeMetadataEditor({ node, onDelete, onUpdate }: {
  node: { id: string; type: string; label: string; metadata: NetworkNodeMetadata };
  onDelete: () => void;
  onUpdate: (nodeId: string, label: string, description: string) => void;
}) {
  const [label, setLabel] = useState(node.label);
  const [description, setDescription] = useState(node.metadata.description ?? '');
  const commit = () => {
    if (label !== node.label || description !== (node.metadata.description ?? '')) onUpdate(node.id, label, description);
  };
  return (
    <div className="grid gap-4">
      <Input label="Display name" onBlur={commit} onChange={(event) => setLabel(event.target.value)} value={label} />
      <Input label="Description" onBlur={commit} onChange={(event) => setDescription(event.target.value)} value={description} />
      <p className="m-0 text-xs text-muted">{node.id} · {node.type}</p>
      <Button onClick={onDelete} variant="danger">Delete node</Button>
    </div>
  );
}
