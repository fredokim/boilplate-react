import { forwardRef, useImperativeHandle } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { coreToApiRoute, networkRoutes } from '../network/networkRoutes';
import { createMockGraphRouteService } from '../services/graphRouteService';
import GraphViewerContainer from './GraphViewerContainer';

const viewportActions = { fitAll: vi.fn(), focusNode: vi.fn(), focusRoute: vi.fn() };

vi.mock('../components/GraphCanvas', () => ({
  GraphCanvas: forwardRef(function MockGraphCanvas(props: {
    interaction: { activeRoute: { nodeIds: readonly string[]; edgeIds: readonly string[] } | null; selection: { nodeIds: readonly string[] } };
    onNodeSelect: (id: string) => void;
  }, ref) {
    useImperativeHandle(ref, () => viewportActions);
    return (
      <div data-testid="graph-canvas">
        <span data-testid="active-nodes">{props.interaction.activeRoute?.nodeIds.join(',') ?? ''}</span>
        <span data-testid="active-edges">{props.interaction.activeRoute?.edgeIds.join(',') ?? ''}</span>
        <span data-testid="selected-node">{props.interaction.selection.nodeIds[0] ?? ''}</span>
        <button onClick={() => props.onNodeSelect('api-server')} type="button">Select API node</button>
      </div>
    );
  }),
}));

vi.mock('../realtime/useTopologyRealtime', () => ({
  useTopologyRealtime: () => ({
    connectionState: 'connected',
    now: 0,
    runtime: {
      nodes: {}, edges: {}, version: 0,
      summary: { unknown: 0, healthy: 0, warning: 0, critical: 0, offline: 0 },
      diagnostics: { received: 0, applied: 0, coalesced: 0, duplicatesIgnored: 0, staleIgnored: 0, unknownEntities: 0, dropped: 0, flushCount: 0, totalBatchSize: 0, reconnectCount: 0, bufferSize: 0, lastResync: null },
    },
    isNodeStale: () => false,
    selectedMetricHistory: {},
    resync: vi.fn(),
  }),
}));

describe('GraphViewerContainer', () => {
  beforeEach(() => vi.clearAllMocks());

  it('applies a route service result to active node and edge ids', async () => {
    const user = userEvent.setup();
    render(<GraphViewerContainer routeService={createMockGraphRouteService({ routes: networkRoutes })} />);
    await user.selectOptions(screen.getByLabelText('Source'), 'core-router');
    await user.selectOptions(screen.getByLabelText('Destination'), 'api-server');
    await user.click(screen.getByRole('button', { name: 'Find route' }));
    expect(await screen.findByTestId('active-nodes')).toHaveTextContent('core-router,edge-firewall,api-server');
    expect(screen.getByTestId('active-edges')).toHaveTextContent('router-to-firewall,firewall-to-api');
  });

  it('keeps the topology available and shows a no-route result', async () => {
    const user = userEvent.setup();
    render(<GraphViewerContainer routeService={createMockGraphRouteService({ routes: [] })} />);
    await user.selectOptions(screen.getByLabelText('Source'), 'api-server');
    await user.selectOptions(screen.getByLabelText('Destination'), 'worker-server');
    await user.click(screen.getByRole('button', { name: 'Find route' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No route');
    expect(screen.getByTestId('graph-canvas')).toBeInTheDocument();
  });

  it('keeps the topology available when the route service fails', async () => {
    const user = userEvent.setup();
    render(<GraphViewerContainer routeService={createMockGraphRouteService({ routes: [], errorMessage: 'Route engine offline' })} />);
    await user.selectOptions(screen.getByLabelText('Source'), 'core-router');
    await user.selectOptions(screen.getByLabelText('Destination'), 'api-server');
    await user.click(screen.getByRole('button', { name: 'Find route' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Route engine offline');
    expect(screen.getByTestId('graph-canvas')).toBeInTheDocument();
  });

  it('clears route state but keeps node selection', async () => {
    const user = userEvent.setup();
    render(<GraphViewerContainer initialRoute={coreToApiRoute} />);
    await user.click(screen.getByRole('button', { name: 'Select API node' }));
    await user.click(screen.getByRole('button', { name: 'Clear route' }));
    expect(screen.getByTestId('active-nodes')).toBeEmptyDOMElement();
    expect(screen.getByTestId('selected-node')).toHaveTextContent('api-server');
  });

  it('preserves route node ordering in the path panel', () => {
    render(<GraphViewerContainer initialRoute={coreToApiRoute} />);
    const path = screen.getByRole('list', { name: 'Ordered route' });
    expect(within(path).getAllByRole('button').map((button) => button.textContent)).toEqual([
      '1Core RouterRouter', '2Edge FirewallFirewall', '3API ServerServer',
    ]);
  });

  it('selects and focuses a node from search results', async () => {
    const user = userEvent.setup();
    render(<GraphViewerContainer />);
    await user.type(screen.getByLabelText('Find node'), 'api-prod-01');
    await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: /API Server/ }));
    expect(screen.getByTestId('selected-node')).toHaveTextContent('api-server');
    await waitFor(() => expect(viewportActions.focusNode).toHaveBeenCalledWith('api-server'));
  });

  it('shows loading while a delayed route request is pending', async () => {
    vi.useFakeTimers();
    render(<GraphViewerContainer routeService={createMockGraphRouteService({ routes: networkRoutes, delayMs: 1000 })} />);
    fireEvent.change(screen.getByLabelText('Source'), { target: { value: 'core-router' } });
    fireEvent.change(screen.getByLabelText('Destination'), { target: { value: 'api-server' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find route' }));
    expect(screen.getByRole('button', { name: 'Find route' })).toBeDisabled();
    await act(() => vi.advanceTimersByTimeAsync(1000));
    vi.useRealTimers();
  });

  it('clears an active route when entering edit mode', async () => {
    const user = userEvent.setup();
    render(<GraphViewerContainer initialRoute={coreToApiRoute} />);
    expect(screen.getByRole('list', { name: 'Ordered route' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit topology' }));
    expect(screen.getByRole('heading', { name: 'Topology Editor' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Ordered route' })).not.toBeInTheDocument();
  });

  it('shows external validation errors without removing the editable topology', () => {
    render(<GraphViewerContainer initialEditMode initialValidationErrors={[{
      targetType: 'edge', targetId: 'firewall-to-worker', code: 'INVALID_INTERFACE', message: 'Selected interface cannot connect.',
    }]} />);
    expect(screen.getByText(/Selected interface cannot connect/)).toBeInTheDocument();
    expect(screen.getByTestId('graph-canvas')).toBeInTheDocument();
  });

  it('asks before discarding a dirty draft and returns to the saved viewer', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<GraphViewerContainer initialDirty initialEditMode />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(confirm).toHaveBeenCalledWith('Discard changes?');
    expect(screen.getByRole('heading', { name: 'Interactive Topology Explorer' })).toBeInTheDocument();
    confirm.mockRestore();
  });
});
