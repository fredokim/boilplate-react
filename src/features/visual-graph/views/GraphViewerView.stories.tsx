import { useEffect, useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { getNetworkNodePresentation, networkGraph } from '../network/networkGraph';
import type { NetworkEdgeMetadata, NetworkNodeMetadata, NetworkNodeType } from '../network/networkGraph';
import type { GraphDocument } from '../model/graph';
import { MockTopologyTransport } from '../realtime/mockTransport';
import type { NodeRuntimeStatus, TopologyRealtimeEvent, TopologyRuntimeSnapshot } from '../realtime/types';
import { useTopologyRealtime } from '../realtime/useTopologyRealtime';
import { GraphViewerView } from './GraphViewerView';

type Scenario = 'normal' | 'node-failure' | 'edge-failure' | 'duplicate' | 'out-of-order' | 'route-failure' | 'disconnect-resync';

function RealtimeGraphStory({ large = false, rate = 1, scenario = 'normal' }: { large?: boolean; rate?: number; scenario?: Scenario }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('edge-firewall');
  const transport = useMemo(() => new MockTopologyTransport(), []);
  const graph = useMemo(() => large ? createLargeGraph(1_000) : networkGraph, [large]);
  const snapshot = useMemo(() => createSnapshot(graph, scenario), [graph, scenario]);
  const loadSnapshot = useMemo(() => async () => snapshot, [snapshot]);
  const realtime = useTopologyRealtime({ topologyId: 'storybook-topology', graph, transport, loadSnapshot, selectedNodeId });

  useEffect(() => {
    let sequence = 10;
    transport.startStress(rate, (index) => createScenarioEvent(graph, scenario, index, ++sequence));
    if (scenario === 'duplicate') {
      const duplicate = createScenarioEvent(graph, scenario, 0, ++sequence);
      const timer = setTimeout(() => { transport.emit(duplicate); transport.emit(duplicate); }, 100);
      return () => { clearTimeout(timer); transport.stopStress(); };
    }
    if (scenario === 'out-of-order') {
      const timer = setTimeout(() => {
        transport.emit(createScenarioEvent(graph, scenario, 0, 100));
        transport.emit(createScenarioEvent(graph, scenario, 1, 99));
      }, 100);
      return () => { clearTimeout(timer); transport.stopStress(); };
    }
    if (scenario === 'disconnect-resync') {
      const timer = setTimeout(() => transport.simulateDrop(), 1_500);
      return () => { clearTimeout(timer); transport.stopStress(); };
    }
    return () => transport.stopStress();
  }, [graph, rate, scenario, transport]);

  return <GraphViewerView getNodePresentation={getNetworkNodePresentation} graph={graph} onNodeSelect={setSelectedNodeId} realtime={realtime} selectedNodeId={selectedNodeId} />;
}

const meta = { title: 'Features/Visual Graph/RealtimeTopology', component: RealtimeGraphStory, parameters: { layout: 'fullscreen' } } satisfies Meta<typeof RealtimeGraphStory>;
export default meta;
type Story = StoryObj<typeof meta>;

export const RealtimeNormal: Story = { args: { rate: 1, scenario: 'normal' } };
export const RealtimeHighFrequency: Story = { args: { rate: 500, scenario: 'normal' } };
export const NodeFailure: Story = { args: { rate: 2, scenario: 'node-failure' } };
export const EdgeFailure: Story = { args: { rate: 2, scenario: 'edge-failure' } };
export const DisconnectReconnectResync: Story = { args: { rate: 5, scenario: 'disconnect-resync' } };
export const DuplicateEvents: Story = { args: { rate: 1, scenario: 'duplicate' } };
export const OutOfOrderEvents: Story = { args: { rate: 1, scenario: 'out-of-order' } };
export const RouteWithFailure: Story = { args: { rate: 2, scenario: 'route-failure' } };
export const LargeRealtimeTopologyStress: Story = { args: { large: true, rate: 1_000, scenario: 'normal' } };

function createSnapshot(graph: GraphDocument<NetworkNodeType, NetworkNodeMetadata, NetworkEdgeMetadata>, scenario: Scenario): TopologyRuntimeSnapshot {
  const now = Date.now();
  const status: NodeRuntimeStatus = scenario === 'route-failure' ? 'critical' : 'healthy';
  return {
    topologyId: 'storybook-topology', revision: 10, capturedAt: now,
    nodes: Object.fromEntries(graph.nodes.map((node) => [node.id, { status: node.id === 'edge-firewall' ? status : 'healthy', metrics: { cpu: 40, memory: 55 }, lastUpdated: now, sequence: 10 }])),
    edges: Object.fromEntries(graph.edges.map((edge) => [edge.id, { status: 'active', metrics: { latency: 12 }, lastUpdated: now, sequence: 10 }])),
  };
}

function createScenarioEvent(graph: GraphDocument<NetworkNodeType, NetworkNodeMetadata, NetworkEdgeMetadata>, scenario: Scenario, index: number, sequence: number): TopologyRealtimeEvent {
  const base = { eventId: `${scenario}-${String(sequence)}`, topologyId: 'storybook-topology', timestamp: Date.now(), sequence };
  if (scenario === 'edge-failure') return { ...base, entityId: 'firewall-to-api', type: 'EDGE_STATUS_CHANGED', payload: { status: index % 2 ? 'degraded' : 'disconnected' } };
  if (scenario === 'node-failure' || scenario === 'route-failure') {
    const statuses: NodeRuntimeStatus[] = ['healthy', 'warning', 'critical', 'offline'];
    return { ...base, entityId: 'edge-firewall', type: 'NODE_STATUS_CHANGED', payload: { status: statuses[index % statuses.length] ?? 'unknown' } };
  }
  const node = graph.nodes[index % graph.nodes.length] ?? graph.nodes[0];
  return { ...base, entityId: node?.id ?? 'core-router', type: 'NODE_METRIC_UPDATED', payload: { metrics: { cpu: (index * 13) % 100, memory: 45 + (index % 45) } } };
}

function createLargeGraph(count: number): GraphDocument<NetworkNodeType, NetworkNodeMetadata, NetworkEdgeMetadata> {
  const columns = 25;
  const nodes = Array.from({ length: count }, (_, index) => {
    const type: NetworkNodeType = index % 9 === 0 ? 'firewall' : index % 3 === 0 ? 'router' : 'server';
    return {
      id: `node-${String(index)}`,
      type,
      label: `Device ${String(index)}`,
      position: { x: (index % columns) * 240, y: Math.floor(index / columns) * 120 },
      metadata: { hostname: `device-${String(index)}`, ipAddress: `10.${String(Math.floor(index / 255))}.${String(index % 255)}.1`, location: `Zone ${String(index % 8)}` },
    };
  });
  const edges = nodes.slice(1).map((node, index) => ({
    id: `edge-${String(index)}`,
    sourceNodeId: nodes[index]?.id ?? nodes[0]?.id ?? '',
    targetNodeId: node.id,
    metadata: { protocol: 'TCP', bandwidthMbps: 1_000 },
  }));
  return { nodes, edges };
}
