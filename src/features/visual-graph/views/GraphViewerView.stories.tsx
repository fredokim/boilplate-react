import type { Meta, StoryObj } from '@storybook/react-vite';
import GraphViewerContainer from '../containers/GraphViewerContainer';
import { largeNetworkGraph, largeNetworkRoute } from '../network/largeNetworkGraph';
import { coreToApiRoute, networkRoutes } from '../network/networkRoutes';
import { createMockGraphRouteService } from '../services/graphRouteService';
import type { GraphDocument } from '../model/graph';
import { networkGraph, type NetworkEdgeMetadata, type NetworkNodeMetadata, type NetworkNodeType } from '../network/networkGraph';
import { dagreLayoutService } from '../layout/dagreLayout';
import { createDeterministicGraph } from '../performance/largeGraphFixture';
import type { TopologyRealtimeEvent } from '../realtime/topologyRealtime';

const runtimeNodeEvent = (sequence: number, status: 'healthy' | 'warning' | 'critical' | 'offline', eventId = `story-node-${String(sequence)}`, entityId = 'edge-firewall'): TopologyRealtimeEvent => ({
  eventId, topologyId: 'network-topology', entityId, timestamp: Date.now() + sequence, sequence, type: 'NODE_STATUS_CHANGED', payload: { status },
});
const runtimeEdgeEvent = (sequence: number, status: 'active' | 'degraded' | 'disconnected'): TopologyRealtimeEvent => ({
  eventId: `story-edge-${String(sequence)}`, topologyId: 'network-topology', entityId: 'firewall-to-worker', timestamp: Date.now() + sequence, sequence, type: 'EDGE_STATUS_CHANGED', payload: { status },
});

const successService = createMockGraphRouteService({ routes: networkRoutes, delayMs: 250 });
const noRouteService = createMockGraphRouteService({ routes: [], noRouteMessage: 'The mock routing engine found no path.' });
const loadingService = createMockGraphRouteService({ routes: networkRoutes, delayMs: 3000 });
const errorService = createMockGraphRouteService({ routes: [], errorMessage: 'The mock routing engine is unavailable.' });
const graphWithAddedNode: GraphDocument<NetworkNodeType, NetworkNodeMetadata, NetworkEdgeMetadata> = {
  ...largeNetworkGraph,
  nodes: [...largeNetworkGraph.nodes, {
    id: 'firewall-draft', type: 'firewall', label: 'Draft Firewall', position: { x: 1320, y: 520 },
    metadata: { hostname: 'fw-draft', ipAddress: 'Unassigned', status: 'healthy', location: 'Lab', description: 'Not saved yet' },
  }],
};
const connectedDraft: typeof graphWithAddedNode = {
  ...graphWithAddedNode,
  edges: [...graphWithAddedNode.edges, {
    id: 'edge-draft', sourceNodeId: 'node-24', targetNodeId: 'firewall-draft', sourcePortId: 'output', targetPortId: 'input',
    metadata: { protocol: 'TLS', bandwidthMbps: 1000, interface: 'eth0', status: 'up' },
  }],
};

const meta = {
  title: 'Features/Visual Graph/GraphViewerView',
  component: GraphViewerContainer,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof GraphViewerContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BasicTopology: Story = { args: { routeService: successService } };

export const ActiveRoute: Story = {
  args: { initialRoute: coreToApiRoute },
};

export const LargeTopology: Story = {
  args: { graph: largeNetworkGraph, initialRoute: largeNetworkRoute },
};

export const NoRoute: Story = {
  args: {
    initialRouteQuery: { status: 'no-route', message: 'The mock routing engine found no path.' },
    routeService: noRouteService,
  },
};

export const RouteLoading: Story = {
  args: { initialRouteQuery: { status: 'loading' }, routeService: loadingService },
};

export const RouteError: Story = {
  args: {
    initialRouteQuery: { status: 'error', message: 'The mock routing engine is unavailable.' },
    routeService: errorService,
  },
};

export const EditMode: Story = { args: { initialEditMode: true } };

export const AddNodes: Story = {
  args: { graph: largeNetworkGraph, initialDraftGraph: graphWithAddedNode, initialDirty: true, initialEditMode: true },
};

export const ConnectedTopology: Story = {
  args: { graph: largeNetworkGraph, initialDraftGraph: connectedDraft, initialDirty: true, initialEditMode: true },
};

export const DirtyState: Story = {
  args: { graph: largeNetworkGraph, initialDraftGraph: graphWithAddedNode, initialDirty: true, initialEditMode: true },
};

export const ValidationError: Story = {
  args: {
    initialEditMode: true,
    initialValidationErrors: [{ targetType: 'edge', targetId: 'firewall-to-worker', code: 'INVALID_INTERFACE', message: 'Selected interface cannot connect.' }],
  },
};

export const CancelRestore: Story = {
  args: { graph: largeNetworkGraph, initialDraftGraph: graphWithAddedNode, initialDirty: true, initialEditMode: true },
};

export const UndoRedo: Story = { args: { initialEditMode: true } };
export const MultiSelect: Story = { args: { graph: largeNetworkGraph, initialEditMode: true } };
export const CopyPaste: Story = { args: { graph: connectedDraft, initialEditMode: true } };
export const Group: Story = { args: { graph: { ...networkGraph, groups: [{ id: 'dmz', name: 'DMZ', childNodeIds: ['edge-firewall', 'api-server'], expanded: true }] }, initialEditMode: true } };
export const AutoLayout: Story = { args: { graph: networkGraph, initialDraftGraph: dagreLayoutService.layout(networkGraph), initialDirty: true, initialEditMode: true } };
export const ImportExport: Story = { args: { initialEditMode: true } };
export const InvalidImport: Story = { args: { initialEditMode: true, initialValidationErrors: [{ targetType: 'graph', targetId: 'import', code: 'INVALID_SCHEMA', message: 'schemaVersion: Invalid input' }] } };
export const Stress50Nodes: Story = { args: { graph: createDeterministicGraph(50), initialEditMode: true } };
export const Stress500Nodes: Story = { args: { graph: createDeterministicGraph(500), initialEditMode: true } };
export const Stress2000Nodes: Story = { args: { graph: createDeterministicGraph(2000), initialEditMode: true } };
export const LargeGraphSearch: Story = { args: { graph: createDeterministicGraph(2000) } };
export const LargeGraphAutoLayout: Story = { args: { graph: createDeterministicGraph(500), initialEditMode: true } };

export const RealtimeNormal: Story = { args: { realtimeOptions: { eventsPerSecond: 10 } } };
export const RealtimeHighFrequency: Story = { args: { graph: createDeterministicGraph(500), realtimeOptions: { eventsPerSecond: 500 } } };
export const NodeFailure: Story = { args: { realtimeOptions: { eventsPerSecond: 1, initialEvents: [runtimeNodeEvent(1, 'warning'), runtimeNodeEvent(2, 'critical'), runtimeNodeEvent(3, 'offline')] } } };
export const EdgeFailure: Story = { args: { realtimeOptions: { eventsPerSecond: 1, initialEvents: [runtimeEdgeEvent(1, 'degraded'), runtimeEdgeEvent(2, 'disconnected')] } } };
export const Disconnect: Story = { args: { realtimeOptions: { eventsPerSecond: 10, disconnectAfterMs: 3_000 } } };
export const Reconnect: Story = { args: { realtimeOptions: { eventsPerSecond: 10, disconnectAfterMs: 2_000 } } };
export const ReconnectAndResync: Story = { args: { realtimeOptions: { eventsPerSecond: 100, disconnectAfterMs: 2_000 } } };
export const DuplicateEvents: Story = { args: { realtimeOptions: { eventsPerSecond: 0, initialEvents: [runtimeNodeEvent(1, 'warning', 'duplicate'), runtimeNodeEvent(1, 'warning', 'duplicate')] } } };
export const OutOfOrderEvents: Story = { args: { realtimeOptions: { eventsPerSecond: 0, initialEvents: [runtimeNodeEvent(10, 'critical'), runtimeNodeEvent(9, 'healthy')] } } };
export const RouteWithFailure: Story = { args: { initialRoute: coreToApiRoute, realtimeOptions: { eventsPerSecond: 1, initialEvents: [runtimeNodeEvent(1, 'critical')] } } };
export const LargeRealtimeTopology: Story = { args: { graph: createDeterministicGraph(2000), realtimeOptions: { eventsPerSecond: 500 } } };
