import { Card } from '@ui/Card';
import { useState } from 'react';
import type { GraphDocument, GraphMetadata, GraphNodePresentationResolver } from '../model/graph';
import { GraphCanvas } from '../components/GraphCanvas';
import type { RealtimeConnectionState, RuntimeStoreSnapshot, NodeRuntimeStatus } from '../realtime/types';

type GraphViewerViewProps<
  TNodeType extends string,
  TNodeMetadata extends GraphMetadata,
  TEdgeMetadata extends GraphMetadata,
> = {
  graph: GraphDocument<TNodeType, TNodeMetadata, TEdgeMetadata>;
  selectedNodeId: string | null;
  getNodePresentation: GraphNodePresentationResolver<TNodeType>;
  onNodeSelect: (nodeId: string | null) => void;
  realtime?: {
    runtime: RuntimeStoreSnapshot;
    connectionState: RealtimeConnectionState;
    isNodeStale: (nodeId: string, thresholdMs?: number) => boolean;
    selectedMetricHistory: Record<string, number[]>;
    resync: () => Promise<void>;
  };
};

function formatMetadataValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value === null || value === undefined) {
    return '—';
  }
  return JSON.stringify(value);
}

export function GraphViewerView<
  TNodeType extends string,
  TNodeMetadata extends GraphMetadata,
  TEdgeMetadata extends GraphMetadata,
>({ getNodePresentation, graph, onNodeSelect, realtime, selectedNodeId }: GraphViewerViewProps<TNodeType, TNodeMetadata, TEdgeMetadata>) {
  const selectedNode = graph.nodes.find((node) => node.id === selectedNodeId);
  const [runtimeFilter, setRuntimeFilter] = useState<NodeRuntimeStatus | 'all'>('all');
  const runtime = realtime?.runtime ?? emptyRuntime;
  const averageBatchSize = runtime.diagnostics.flushCount
    ? (runtime.diagnostics.totalBatchSize / runtime.diagnostics.flushCount).toFixed(1)
    : '0';

  return (
    <div className="page-grid">
      <div className="page-heading">
        <div>
          <h1 className="m-0 text-2xl font-black text-ink">Visual Graph Viewer</h1>
          <p className="mt-2 text-sm text-muted">Static topology with independently streamed health and metric state.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2" aria-live="polite">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${realtime?.connectionState === 'connected' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
            Realtime: {realtime?.connectionState ?? 'disconnected'}
          </span>
          {realtime?.connectionState !== 'connected' ? <span className="text-xs font-semibold text-amber-800">Runtime data may be stale</span> : null}
          <button className="rounded border border-line bg-white px-3 py-1 text-xs font-bold" type="button" onClick={() => void realtime?.resync()}>Resync</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Runtime status summary and filters">
        {(['all', 'healthy', 'warning', 'critical', 'offline'] as const).map((status) => (
          <button
            className={`rounded-lg border px-3 py-2 text-sm font-bold ${runtimeFilter === status ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-line bg-white text-ink'}`}
            key={status}
            onClick={() => setRuntimeFilter(status)}
            type="button"
          >
            {status === 'all' ? `All ${String(graph.nodes.length)}` : `${status} ${String(runtime.summary[status])}`}
          </button>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <GraphCanvas
          edgeRuntime={runtime.edges}
          getNodePresentation={getNodePresentation}
          graph={graph}
          isNodeStale={(id) => realtime?.isNodeStale(id) ?? false}
          nodeRuntime={runtime.nodes}
          onNodeSelect={onNodeSelect}
          selectedNodeId={selectedNodeId}
          runtimeFilter={runtimeFilter}
        />
        <Card title="Node metadata" description="Select a node in the graph.">
          {selectedNode ? (
            <dl className="m-0 grid gap-3 text-sm">
              <div>
                <dt className="font-semibold text-muted">Name</dt>
                <dd className="m-0 mt-1 font-bold text-ink">{selectedNode.label}</dd>
              </div>
              <div>
                <dt className="font-semibold text-muted">Type</dt>
                <dd className="m-0 mt-1 text-ink">{selectedNode.type}</dd>
              </div>
              {Object.entries(selectedNode.metadata).map(([key, value]) => (
                <div key={key}>
                  <dt className="font-semibold capitalize text-muted">{key}</dt>
                  <dd className="m-0 mt-1 break-words text-ink">{formatMetadataValue(value)}</dd>
                </div>
              ))}
              <div>
                <dt className="font-semibold text-muted">Runtime</dt>
                <dd className="m-0 mt-1 text-ink">{runtime.nodes[selectedNode.id]?.status ?? 'unknown'}</dd>
              </div>
              {Object.entries(runtime.nodes[selectedNode.id]?.metrics ?? {}).map(([key, value]) => (
                <div key={`metric-${key}`}>
                  <dt className="font-semibold capitalize text-muted">{key}</dt>
                  <dd className="m-0 mt-1 text-ink">{value}</dd>
                </div>
              ))}
              {Object.entries(realtime?.selectedMetricHistory ?? {}).map(([key, values]) => (
                <div key={`history-${key}`}>
                  <dt className="font-semibold capitalize text-muted">{key} history</dt>
                  <dd className="m-0 mt-1 break-words text-xs text-ink">{values.join(' → ') || 'Waiting for samples'}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="m-0 text-sm text-muted">No node selected.</p>
          )}
        </Card>
      </div>
      <details className="rounded-lg border border-line bg-slate-950 p-4 text-xs text-slate-100">
        <summary className="cursor-pointer font-bold">Realtime performance debug</summary>
        <dl className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <DebugMetric label="Received" value={runtime.diagnostics.received} />
          <DebugMetric label="Applied" value={runtime.diagnostics.applied} />
          <DebugMetric label="Dropped / coalesced" value={[runtime.diagnostics.dropped, runtime.diagnostics.coalesced].join(' / ')} />
          <DebugMetric label="Duplicate / stale" value={[runtime.diagnostics.duplicatesIgnored, runtime.diagnostics.staleIgnored].join(' / ')} />
          <DebugMetric label="Unknown entity" value={runtime.diagnostics.unknownEntities} />
          <DebugMetric label="Buffer / flushes" value={[runtime.diagnostics.bufferSize, runtime.diagnostics.flushCount].join(' / ')} />
          <DebugMetric label="Average batch" value={averageBatchSize} />
          <DebugMetric label="Runtime / reconnects" value={[Object.keys(runtime.nodes).length + Object.keys(runtime.edges).length, runtime.diagnostics.reconnectCount].join(' / ')} />
          <DebugMetric label="Last resync" value={runtime.diagnostics.lastResync ? new Date(runtime.diagnostics.lastResync).toLocaleTimeString() : '—'} />
        </dl>
      </details>
    </div>
  );
}

function DebugMetric({ label, value }: { label: string; value: string | number }) {
  return <div><dt className="text-slate-400">{label}</dt><dd className="m-0 mt-1 font-bold">{value}</dd></div>;
}

const emptyRuntime: RuntimeStoreSnapshot = {
  nodes: {},
  edges: {},
  summary: { unknown: 0, healthy: 0, warning: 0, critical: 0, offline: 0 },
  diagnostics: {
    received: 0, applied: 0, coalesced: 0, duplicatesIgnored: 0, staleIgnored: 0, unknownEntities: 0,
    dropped: 0, flushCount: 0, totalBatchSize: 0, reconnectCount: 0, bufferSize: 0, lastResync: null,
  },
  version: 0,
};

