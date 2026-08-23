import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@ui/Button';
import { Card } from '@ui/Card';
import { Input } from '@ui/Input';
import type { GraphDocument, GraphMetadata, GraphNodePresentationResolver } from '../model/graph';
import type { GraphInteractionState, GraphRouteQueryState } from '../model/graphInteraction';
import { createGraphSearchIndex, searchGraphIndex } from '../performance/graphSearchIndex';
import { GraphCanvas, type GraphCanvasHandle } from '../components/GraphCanvas';
import type { NodeRuntimeStatus, TopologyConnectionState, TopologyRuntimeView } from '../realtime/topologyRealtime';

type GraphViewerViewProps<TNodeType extends string, TNodeMetadata extends GraphMetadata, TEdgeMetadata extends GraphMetadata> = {
  graph: GraphDocument<TNodeType, TNodeMetadata, TEdgeMetadata>;
  interaction: GraphInteractionState;
  routeQuery: GraphRouteQueryState;
  getNodePresentation: GraphNodePresentationResolver<TNodeType>;
  onNodeSelect: (nodeId: string | null) => void;
  onNodeHover: (nodeId: string | null) => void;
  onEdgeHover: (edgeId: string | null) => void;
  onSourceChange: (nodeId: string | null) => void;
  onDestinationChange: (nodeId: string | null) => void;
  onRouteSearch: () => void;
  onRouteClear: () => void;
  onEdit: () => void;
  connectionState: TopologyConnectionState;
  runtime: TopologyRuntimeView;
};

function formatMetadataValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return '—';
  return JSON.stringify(value);
}

export function GraphViewerView<TNodeType extends string, TNodeMetadata extends GraphMetadata, TEdgeMetadata extends GraphMetadata>({
  connectionState, getNodePresentation, graph, interaction, onDestinationChange, onEdgeHover, onEdit, onNodeHover, onNodeSelect,
  onRouteClear, onRouteSearch, onSourceChange, routeQuery, runtime,
}: GraphViewerViewProps<TNodeType, TNodeMetadata, TEdgeMetadata>) {
  const canvasRef = useRef<GraphCanvasHandle>(null);
  const [nodeQuery, setNodeQuery] = useState('');
  const [runtimeFilter, setRuntimeFilter] = useState<'all' | Exclude<NodeRuntimeStatus, 'healthy' | 'unknown'>>('all');
  const [runtimeNow, setRuntimeNow] = useState(() => Date.now());
  const [rates, setRates] = useState({ received: 0, applied: 0 });
  const previousTotals = useRef({ received: 0, applied: 0 });
  const latestTotals = useRef({ received: 0, applied: 0 });
  const deferredQuery = useDeferredValue(nodeQuery);
  const searchIndex = useMemo(() => createGraphSearchIndex(graph), [graph]);
  const matchingNodes = useMemo(() => searchGraphIndex(searchIndex, deferredQuery).slice(0, 8).map((id) => graph.nodes.find((node) => node.id === id)).filter((node) => node !== undefined), [deferredQuery, graph.nodes, searchIndex]);
  const selectedNode = graph.nodes.find((node) => node.id === interaction.selection.nodeIds[0]);
  const hoveredEdge = graph.edges.find((edge) => edge.id === interaction.hoveredEdgeId);
  const routeNodes = interaction.activeRoute?.nodeIds.map((id) => graph.nodes.find((node) => node.id === id)).filter(Boolean) ?? [];
  const selectedRuntime = selectedNode ? runtime.nodes.get(selectedNode.id) : undefined;

  useEffect(() => { latestTotals.current = { received: runtime.debug.eventsReceived, applied: runtime.debug.eventsApplied }; }, [runtime.debug.eventsApplied, runtime.debug.eventsReceived]);

  useEffect(() => {
    const staleTimer = setInterval(() => setRuntimeNow(Date.now()), 10_000);
    const rateTimer = setInterval(() => {
      const next = latestTotals.current;
      setRates({ received: next.received - previousTotals.current.received, applied: next.applied - previousTotals.current.applied });
      previousTotals.current = next;
    }, 1_000);
    return () => { clearInterval(staleTimer); clearInterval(rateTimer); };
  }, []);

  useEffect(() => {
    if (interaction.activeRoute) canvasRef.current?.focusRoute(interaction.activeRoute.nodeIds);
  }, [interaction.activeRoute]);

  const selectAndFocusNode = (nodeId: string) => {
    onNodeSelect(nodeId);
    canvasRef.current?.focusNode(nodeId);
  };

  return (
    <div className="page-grid">
      <div className="page-heading">
        <div>
          <h1 className="m-0 text-2xl font-black text-ink">Interactive Topology Explorer</h1>
          <p className="mt-2 text-sm text-muted">Search equipment, inspect metadata, and visualize routes calculated by an external engine.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${connectionState === 'connected' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-900'}`} role="status">Realtime: {connectionState}</span>
          <Button onClick={onEdit}>Edit topology</Button>
        </div>
      </div>

      <Card title="Runtime health" description="Incremental counters from the realtime state store; filters dim nodes without removing topology.">
        <div className="flex flex-wrap items-center gap-3">
          {(['healthy', 'warning', 'critical', 'offline', 'unknown'] as const).map((status) => <span className="rounded-md bg-slate-50 px-3 py-2 text-sm" key={status}><strong className="capitalize">{status}</strong> {runtime.summary[status]}</span>)}
          <label className="ml-auto grid gap-1 text-xs font-semibold text-muted">Runtime filter
            <select className="h-9 rounded-md border border-line bg-white px-3 text-sm text-ink" onChange={(event) => setRuntimeFilter(event.target.value as typeof runtimeFilter)} value={runtimeFilter}>
              <option value="all">All</option><option value="warning">Warning</option><option value="critical">Critical</option><option value="offline">Offline</option>
            </select>
          </label>
        </div>
      </Card>

      <Card title="Explore topology" description="Search by node name, id, or a primitive metadata value.">
        <div className="grid gap-4 xl:grid-cols-[minmax(240px,1fr)_repeat(2,minmax(180px,0.7fr))_auto] xl:items-end">
          <div className="relative">
            <Input label="Find node" onChange={(event) => setNodeQuery(event.target.value)} placeholder="API Server or api-server" value={nodeQuery} />
            {nodeQuery.trim() ? (
              <div className="absolute z-10 mt-1 grid max-h-56 w-full overflow-auto rounded-md border border-line bg-white p-1 shadow-lg" role="listbox">
                {matchingNodes.length ? matchingNodes.map((node) => (
                  <button
                    className="rounded px-3 py-2 text-left text-sm hover:bg-slate-100"
                    key={node.id}
                    onClick={() => { selectAndFocusNode(node.id); setNodeQuery(node.label); }}
                    role="option"
                    type="button"
                  >
                    <strong className="block text-ink">{node.label}</strong>
                    <span className="text-xs text-muted">{node.id}</span>
                  </button>
                )) : <p className="m-0 px-3 py-2 text-sm text-muted">No matching nodes.</p>}
              </div>
            ) : null}
          </div>
          <NodeSelect label="Source" nodes={graph.nodes} onChange={onSourceChange} value={interaction.sourceNodeId} />
          <NodeSelect label="Destination" nodes={graph.nodes} onChange={onDestinationChange} value={interaction.destinationNodeId} />
          <Button disabled={!interaction.sourceNodeId || !interaction.destinationNodeId || routeQuery.status === 'loading'} isLoading={routeQuery.status === 'loading'} onClick={onRouteSearch}>
            Find route
          </Button>
        </div>
        {routeQuery.status === 'no-route' || routeQuery.status === 'error' ? (
          <p className={`mb-0 mt-3 rounded-md px-3 py-2 text-sm ${routeQuery.status === 'error' ? 'bg-red-50 text-danger' : 'bg-amber-50 text-amber-800'}`} role="alert">
            {routeQuery.message}
          </p>
        ) : null}
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => canvasRef.current?.fitAll()} size="sm" variant="secondary">Fit all</Button>
        <Button disabled={!interaction.selection.nodeIds.length} onClick={() => interaction.selection.nodeIds[0] && canvasRef.current?.focusNode(interaction.selection.nodeIds[0])} size="sm" variant="secondary">Focus selected</Button>
        <Button disabled={!interaction.activeRoute} onClick={() => interaction.activeRoute && canvasRef.current?.focusRoute(interaction.activeRoute.nodeIds)} size="sm" variant="secondary">Focus route</Button>
        <Button disabled={!interaction.activeRoute && routeQuery.status === 'idle'} onClick={onRouteClear} size="sm" variant="ghost">Clear route</Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <GraphCanvas edgeRuntime={runtime.edges} getNodePresentation={getNodePresentation} graph={graph} interaction={interaction} nodeRuntime={runtime.nodes} onEdgeHover={onEdgeHover} onNodeHover={onNodeHover} onNodeSelect={onNodeSelect} ref={canvasRef} runtimeFilter={runtimeFilter} runtimeNow={runtimeNow} />
        <div className="grid content-start gap-5">
          <Card title="Route detail" description="The ordered path returned by the route service.">
            {interaction.activeRoute ? (
              <ol className="m-0 grid list-none gap-2 p-0" aria-label="Ordered route">
                {routeNodes.map((node, index) => node ? (
                  <li key={node.id}>
                    <button className="flex w-full items-center gap-3 rounded-md border border-line p-2 text-left hover:bg-slate-50" onClick={() => selectAndFocusNode(node.id)} type="button">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-50 text-xs font-black text-primary">{index + 1}</span>
                      <span><strong className="block text-sm text-ink">{node.label}</strong><small className="text-muted">{getNodePresentation(node.type).typeLabel}</small></span>
                    </button>
                  </li>
                ) : null)}
              </ol>
            ) : <p className="m-0 text-sm text-muted">Search for a route to see its ordered path.</p>}
          </Card>

          <Card title="Node metadata" description="Selection remains independent from the active route.">
            {selectedNode ? <><MetadataList entries={{ name: selectedNode.label, type: selectedNode.type, ...selectedNode.metadata, runtimeStatus: selectedRuntime?.status ?? 'unknown', lastUpdated: selectedRuntime ? new Date(selectedRuntime.lastUpdated).toLocaleTimeString() : '—', ...selectedRuntime?.metrics }} />{runtime.metricHistory.size ? <div className="mt-4 border-t border-line pt-3 text-xs text-muted">{[...runtime.metricHistory].map(([name, values]) => <p className="m-0 mt-1" key={name}><strong>{name}</strong>: {values.slice(-8).join(' → ')}</p>)}</div> : null}</> : <p className="m-0 text-sm text-muted">No node selected.</p>}
          </Card>

          <Card title="Edge metadata" description="Hover a connection to inspect it.">
            {hoveredEdge ? <MetadataList entries={{ id: hoveredEdge.id, label: hoveredEdge.label ?? '—', ...hoveredEdge.metadata }} /> : <p className="m-0 text-sm text-muted">No edge hovered.</p>}
          </Card>

          <Card title="Realtime debug" description="Development telemetry for buffering, ordering, and reconnect behavior.">
            <MetadataList entries={{ connectionState, eventsReceivedPerSecond: rates.received, eventsAppliedPerSecond: rates.applied, eventsReceived: runtime.debug.eventsReceived, eventsApplied: runtime.debug.eventsApplied, coalesced: runtime.debug.eventsCoalesced, duplicatesIgnored: runtime.debug.duplicateIgnored, staleIgnored: runtime.debug.staleIgnored, unknownEntityIgnored: runtime.debug.unknownEntityIgnored, bufferSize: runtime.debug.bufferSize, flushCount: runtime.debug.flushCount, averageBatchSize: runtime.debug.averageBatchSize.toFixed(1), runtimeStateCount: runtime.nodes.size + runtime.edges.size, reconnectCount: runtime.debug.reconnectCount, lastResync: runtime.debug.lastResyncAt ? new Date(runtime.debug.lastResyncAt).toLocaleTimeString() : '—' }} />
          </Card>
        </div>
      </div>
    </div>
  );
}

function NodeSelect({ label, nodes, onChange, value }: { label: string; nodes: readonly { id: string; label: string }[]; onChange: (nodeId: string | null) => void; value: string | null }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <select className="h-11 rounded-md border border-line bg-white px-3 text-sm" onChange={(event) => onChange(event.target.value || null)} value={value ?? ''}>
        <option value="">Select {label.toLocaleLowerCase()}</option>
        {nodes.map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}
      </select>
    </label>
  );
}

function MetadataList({ entries }: { entries: GraphMetadata }) {
  return (
    <dl className="m-0 grid gap-3 text-sm">
      {Object.entries(entries).map(([key, value]) => (
        <div key={key}>
          <dt className="font-semibold capitalize text-muted">{key}</dt>
          <dd className="m-0 mt-1 break-words text-ink">{formatMetadataValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}
