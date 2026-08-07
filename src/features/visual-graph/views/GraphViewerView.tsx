import { Card } from '@ui/Card';
import type { GraphDocument, GraphMetadata, GraphNodePresentationResolver } from '../model/graph';
import { GraphCanvas } from '../components/GraphCanvas';

type GraphViewerViewProps<
  TNodeType extends string,
  TNodeMetadata extends GraphMetadata,
  TEdgeMetadata extends GraphMetadata,
> = {
  graph: GraphDocument<TNodeType, TNodeMetadata, TEdgeMetadata>;
  selectedNodeId: string | null;
  getNodePresentation: GraphNodePresentationResolver<TNodeType>;
  onNodeSelect: (nodeId: string | null) => void;
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
>({ getNodePresentation, graph, onNodeSelect, selectedNodeId }: GraphViewerViewProps<TNodeType, TNodeMetadata, TEdgeMetadata>) {
  const selectedNode = graph.nodes.find((node) => node.id === selectedNodeId);

  return (
    <div className="page-grid">
      <div className="page-heading">
        <div>
          <h1 className="m-0 text-2xl font-black text-ink">Visual Graph Viewer</h1>
          <p className="mt-2 text-sm text-muted">Pan, zoom, and select a node to inspect server-provided graph metadata.</p>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <GraphCanvas
          getNodePresentation={getNodePresentation}
          graph={graph}
          onNodeSelect={onNodeSelect}
          selectedNodeId={selectedNodeId}
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
            </dl>
          ) : (
            <p className="m-0 text-sm text-muted">No node selected.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

