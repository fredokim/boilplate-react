import { useEffect, useMemo, useRef, useState } from 'react';
import type { Connection } from '@xyflow/react';
import { addEdge, addGroup, addNode, copySelection, moveGroup, moveSelection, pasteClipboard, removeSelection, updateNode, type GraphClipboard, type GraphCommandResult } from '../editing/graphCommands';
import { applyGraphCommand, beginGraphEdit, cancelGraphEdit, createGraphEditorSession, redoGraphEdit, saveGraphEdit, undoGraphEdit } from '../editing/graphEditorSession';
import { browserGraphIdFactory, type GraphIdFactory } from '../editing/graphIdFactory';
import { createMemoryGraphRepository, type GraphRepository } from '../editing/graphRepository';
import { createMockNetworkValidationService, validateGraphStructure, type GraphValidationError, type NetworkValidationService } from '../editing/graphValidation';
import { providedPositionLayout, type GraphLayoutEngine } from '../layout/graphLayout';
import { emptyGraphSelection, type GraphDocument, type GraphRoute, type GraphSelection } from '../model/graph';
import type { GraphInteractionState, GraphRouteQueryState } from '../model/graphInteraction';
import { getNetworkNodePresentation, networkGraph, type NetworkEdgeMetadata, type NetworkNodeMetadata, type NetworkNodeType } from '../network/networkGraph';
import { networkRouteService } from '../network/networkRoutes';
import type { GraphRouteService } from '../services/graphRouteService';
import { GraphEditorView } from '../views/GraphEditorView';
import { GraphViewerView } from '../views/GraphViewerView';
import { exportGraph, importGraph } from '../editing/graphSerialization';
import { createLayoutCoordinator, createWorkerLayoutExecutor } from '../layout/layoutCoordinator';
import { useTopologyRealtime } from '../realtime/useTopologyRealtime';
import { createGraphRuntimeSource, type GraphRealtimeSource } from '../realtime/graphRuntimeSource';
import { networkRealtimeSource } from '../network/networkRealtime';

type NetworkGraph = GraphDocument<NetworkNodeType, NetworkNodeMetadata, NetworkEdgeMetadata>;

function sameSelection(left: GraphSelection, right: GraphSelection) {
  return left.nodeIds.join('|') === right.nodeIds.join('|') && left.edgeIds.join('|') === right.edgeIds.join('|') && left.groupIds.join('|') === right.groupIds.join('|');
}

export type GraphViewerContainerProps = {
  graph?: NetworkGraph;
  routeService?: GraphRouteService;
  layoutEngine?: GraphLayoutEngine;
  repository?: GraphRepository<NetworkGraph>;
  idFactory?: GraphIdFactory;
  validationService?: NetworkValidationService;
  initialRoute?: GraphRoute | null;
  initialRouteQuery?: GraphRouteQueryState;
  initialEditMode?: boolean;
  initialDraftGraph?: NetworkGraph;
  initialDirty?: boolean;
  initialValidationErrors?: readonly GraphValidationError[];
  realtimeSource?: GraphRealtimeSource;
};

export default function GraphViewerContainer({
  graph = networkGraph, idFactory = browserGraphIdFactory, initialDirty = false, initialDraftGraph,
  initialEditMode = false, initialRoute = null, initialRouteQuery = initialRoute ? { status: 'success' } : { status: 'idle' },
  initialValidationErrors = [], layoutEngine = providedPositionLayout, repository, routeService = networkRouteService,
  validationService = createMockNetworkValidationService(), realtimeSource,
}: GraphViewerContainerProps) {
  const requestSequence = useRef(0);
  const clipboardRef = useRef<GraphClipboard<NetworkNodeType, NetworkNodeMetadata, NetworkEdgeMetadata> | null>(null);
  const layoutCoordinatorRef = useRef(createLayoutCoordinator(createWorkerLayoutExecutor()));
  const [layoutTimeMs, setLayoutTimeMs] = useState(0);
  const repositoryRef = useRef(repository ?? createMemoryGraphRepository(graph));
  const [session, setSession] = useState(() => {
    const base = createGraphEditorSession(graph);
    if (!initialEditMode) return base;
    const editing = beginGraphEdit(base);
    return { ...editing, draftGraph: initialDraftGraph ?? editing.draftGraph, dirty: initialDirty };
  });
  const [interaction, setInteraction] = useState<GraphInteractionState>({
    selection: emptyGraphSelection(), hoveredNodeId: null, hoveredEdgeId: null, activeRoute: initialEditMode ? null : initialRoute,
    sourceNodeId: initialEditMode ? null : (initialRoute?.sourceNodeId ?? null),
    destinationNodeId: initialEditMode ? null : (initialRoute?.destinationNodeId ?? null),
  });
  const [routeQuery, setRouteQuery] = useState<GraphRouteQueryState>(initialEditMode ? { status: 'idle' } : initialRouteQuery);
  const [paletteType, setPaletteType] = useState<NetworkNodeType | null>(null);
  const [validationErrors, setValidationErrors] = useState<readonly GraphValidationError[]>(initialValidationErrors);
  const [saving, setSaving] = useState(false);
  const runtimeSource = useMemo(
    () => realtimeSource ?? (graph === networkGraph ? networkRealtimeSource : createGraphRuntimeSource(graph)),
    [graph, realtimeSource],
  );
  const selectedNodeId = interaction.selection.nodeIds[0] ?? null;
  const realtime = useTopologyRealtime({
    topologyId: runtimeSource.topologyId,
    graph,
    transport: runtimeSource.transport,
    loadSnapshot: runtimeSource.loadSnapshot,
    selectedNodeId,
  });

  // Only the scripted mock has a driver. A server source leaves this absent, so
  // the demo's synthetic event stream cannot run on top of the gateway's real one.
  useEffect(() => runtimeSource.driveEvents?.(), [runtimeSource]);

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (!session.editMode || !session.dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [session.dirty, session.editMode]);

  const searchRoute = async () => {
    const { destinationNodeId, sourceNodeId } = interaction;
    if (!sourceNodeId || !destinationNodeId) return;
    const sequence = ++requestSequence.current;
    setRouteQuery({ status: 'loading' });
    try {
      const response = await routeService.findRoute({ destinationNodeId, sourceNodeId });
      if (requestSequence.current !== sequence) return;
      if (response.status === 'success') {
        setInteraction((current) => ({ ...current, activeRoute: response.route }));
        setRouteQuery({ status: 'success' });
      } else {
        setInteraction((current) => ({ ...current, activeRoute: null }));
        setRouteQuery({ status: 'no-route', message: response.message ?? 'No route found.' });
      }
    } catch (error) {
      if (requestSequence.current !== sequence) return;
      setInteraction((current) => ({ ...current, activeRoute: null }));
      setRouteQuery({ status: 'error', message: error instanceof Error ? error.message : 'Route lookup failed.' });
    }
  };

  const clearRoute = () => {
    requestSequence.current += 1;
    setInteraction((current) => ({ ...current, activeRoute: null, sourceNodeId: null, destinationNodeId: null }));
    setRouteQuery({ status: 'idle' });
  };

  const enterEditMode = () => {
    clearRoute();
    setInteraction((current) => ({ ...current, selection: emptyGraphSelection() }));
    setValidationErrors([]);
    setSession((current) => beginGraphEdit(current));
  };

  const applyCommand = (result: GraphCommandResult<NetworkGraph>) => {
    setSession((current) => applyGraphCommand(current, result));
    if (result.error) setValidationErrors([{ targetType: 'graph', targetId: 'draft', code: 'EDIT_REJECTED', message: result.error }]);
    else if (result.changed) setValidationErrors([]);
  };

  const draftGraph = session.draftGraph;
  const addDraftNode = (type: NetworkNodeType, position: { x: number; y: number }) => {
    if (!draftGraph) return;
    const id = idFactory.createNodeId(type);
    const typeCount = draftGraph.nodes.filter((node) => node.type === type).length + 1;
    applyCommand(addNode(draftGraph, {
      id, type, label: `${getNetworkNodePresentation(type).typeLabel} ${String(typeCount)}`, position,
      metadata: { hostname: id, ipAddress: 'Unassigned', location: 'Unassigned', description: '' },
    }));
    setInteraction((current) => ({ ...current, selection: { nodeIds: [id], edgeIds: [], groupIds: [] } }));
    setPaletteType(null);
  };

  const connectDraftNodes = (connection: Connection) => {
    if (!draftGraph || !connection.source || !connection.target) return;
    const optionalPorts = {
      ...(connection.sourceHandle ? { sourcePortId: connection.sourceHandle } : {}),
      ...(connection.targetHandle ? { targetPortId: connection.targetHandle } : {}),
    };
    applyCommand(addEdge(draftGraph, {
      id: idFactory.createEdgeId(), sourceNodeId: connection.source, targetNodeId: connection.target, ...optionalPorts,
      metadata: { protocol: 'Unspecified', bandwidthMbps: 0, interface: 'default', status: 'up' },
    }));
  };

  const deleteSelection = () => {
    if (!draftGraph || (!interaction.selection.nodeIds.length && !interaction.selection.edgeIds.length && !interaction.selection.groupIds.length)) return;
    const result = removeSelection(draftGraph, interaction.selection);
    applyCommand(result);
    if (result.changed) setInteraction((current) => ({ ...current, selection: emptyGraphSelection() }));
  };

  const copyDraftSelection = () => { if (draftGraph) clipboardRef.current = copySelection(draftGraph, interaction.selection); };
  const pasteDraftSelection = () => {
    if (!draftGraph || !clipboardRef.current) return;
    const result = pasteClipboard(draftGraph, clipboardRef.current, idFactory);
    applyCommand(result); if (result.changed) setInteraction((current) => ({ ...current, selection: result.selection }));
  };
  const groupDraftSelection = () => {
    if (!draftGraph || interaction.selection.nodeIds.length < 2) return;
    const id = idFactory.createGroupId();
    applyCommand(addGroup(draftGraph, { id, name: `Group ${String((draftGraph.groups?.length ?? 0) + 1)}`, childNodeIds: interaction.selection.nodeIds, expanded: true }));
    setInteraction((current) => ({ ...current, selection: { nodeIds: [], edgeIds: [], groupIds: [id] } }));
  };

  const validateDraft = async () => {
    if (!draftGraph) return [];
    const structural = validateGraphStructure(draftGraph);
    const network = await validationService.validate(draftGraph);
    const errors = [...structural.errors, ...network.errors];
    setValidationErrors(errors);
    return errors;
  };

  const saveDraft = async () => {
    if (!draftGraph) return;
    setSaving(true);
    const errors = await validateDraft();
    if (!errors.length) {
      await repositoryRef.current.save(draftGraph);
      setSession((current) => saveGraphEdit(current));
      setInteraction((current) => ({ ...current, selection: emptyGraphSelection() }));
    }
    setSaving(false);
  };

  const cancelDraft = () => {
    if (session.dirty && !window.confirm('Discard changes?')) return;
    setSession((current) => cancelGraphEdit(current));
    setInteraction((current) => ({ ...current, selection: emptyGraphSelection() }));
    setValidationErrors([]);
    setPaletteType(null);
  };

  if (session.editMode && draftGraph) {
    return (
      <GraphEditorView
        canRedo={session.future.length > 0}
        canUndo={session.past.length > 0}
        dirty={session.dirty}
        graph={layoutEngine.layout(draftGraph)}
        interaction={interaction}
        onCancel={cancelDraft}
        onCanvasAdd={(position) => paletteType && addDraftNode(paletteType, position)}
        onConnect={connectDraftNodes}
        onDeleteSelection={deleteSelection}
        onNodeMove={(nodeId, position) => applyCommand(moveSelection(draftGraph, nodeId, position, interaction.selection))}
        onUndo={() => setSession((current) => undoGraphEdit(current))}
        onRedo={() => setSession((current) => redoGraphEdit(current))}
        onCopy={copyDraftSelection}
        onPaste={pasteDraftSelection}
        onDuplicate={() => { copyDraftSelection(); pasteDraftSelection(); }}
        onGroup={groupDraftSelection}
        onMoveGroup={(groupId) => applyCommand(moveGroup(draftGraph, groupId, { x: 40, y: 40 }))}
        onAutoLayout={() => { const started = performance.now(); void layoutCoordinatorRef.current.layout(draftGraph).then((result) => { setLayoutTimeMs(performance.now() - started); if (result.status === 'applied') applyCommand({ graph: result.graph as NetworkGraph, changed: true }); else if (result.status === 'error') setValidationErrors([{ targetType: 'graph', targetId: 'layout', code: 'LAYOUT_ERROR', message: result.message }]); }); }}
        debug={{ historyEntries: session.past.length + session.future.length, layoutTimeMs }}
        onExport={() => exportGraph(draftGraph)}
        onImport={(json) => {
          const result = importGraph(json);
          if (result.success) applyCommand({ graph: result.graph as NetworkGraph, changed: true });
          else setValidationErrors(result.errors.map((message, index) => ({ targetType: 'graph', targetId: 'import', code: `IMPORT_${String(index)}`, message })));
        }}
        onPaletteChange={setPaletteType}
        onSave={() => void saveDraft()}
        onSelectionChange={(selection: GraphSelection) => setInteraction((current) => sameSelection(current.selection, selection) ? current : { ...current, selection })}
        onUpdateNode={(nodeId, label, description) => {
          const node = draftGraph.nodes.find((candidate) => candidate.id === nodeId);
          if (node) applyCommand(updateNode(draftGraph, nodeId, { label, metadata: { ...node.metadata, description } }));
        }}
        onValidate={() => void validateDraft()}
        paletteType={paletteType}
        saving={saving}
        validationErrors={validationErrors}
      />
    );
  }

  return (
    <GraphViewerView
      getNodePresentation={getNetworkNodePresentation}
      graph={layoutEngine.layout(session.savedGraph)}
      interaction={interaction}
      onDestinationChange={(destinationNodeId) => setInteraction((current) => ({ ...current, destinationNodeId }))}
      onEdgeHover={(hoveredEdgeId) => setInteraction((current) => ({ ...current, hoveredEdgeId }))}
      onEdit={enterEditMode}
      onNodeHover={(hoveredNodeId) => setInteraction((current) => ({ ...current, hoveredNodeId }))}
      onNodeSelect={(nodeId) => setInteraction((current) => ({ ...current, selection: nodeId ? { nodeIds: [nodeId], edgeIds: [], groupIds: [] } : emptyGraphSelection() }))}
      onRouteClear={clearRoute}
      onRouteSearch={() => void searchRoute()}
      onSourceChange={(sourceNodeId) => setInteraction((current) => ({ ...current, sourceNodeId }))}
      routeQuery={routeQuery}
      connectionState={realtime.connectionState}
      runtime={realtime.runtime}
      isNodeStale={realtime.isNodeStale}
      selectedMetricHistory={realtime.selectedMetricHistory}
    />
  );
}
