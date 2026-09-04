import { tokenStorage } from '@core/auth/tokenStorage';
import { createGraphRuntimeSource, type GraphRealtimeSource } from '../realtime/graphRuntimeSource';
import { isServerBackedTopology } from '../realtime/realtimeSourceMode';
import { fetchTopologySnapshot, ServerTopologyTransport } from '../realtime/serverTopologySource';
import { networkGraph } from './networkGraph';

/**
 * The graph the demo page watches.
 *
 * In server mode this is a `Graph.id`, and the seed publishes a graph under it
 * so a fresh database has a topology to subscribe to.
 */
export const networkTopologyId = 'seoul-production';

/**
 * Curated starting state for the demo topology so the first paint shows a mixed
 * health picture instead of an all-green graph.
 */
export const networkRuntimeSource = createGraphRuntimeSource(networkGraph, {
  topologyId: networkTopologyId,
  eventsPerSecond: 10,
  initialNodeStatus: {
    'core-router': 'healthy',
    'edge-firewall': 'healthy',
    'api-server': 'healthy',
    'worker-server': 'warning',
  },
  initialEdgeStatus: {
    'router-to-firewall': 'active',
    'firewall-to-api': 'active',
    'firewall-to-worker': 'degraded',
  },
});

/**
 * The source the viewer actually uses.
 *
 * `realtimeSourceMode` decided nothing until now: the container took the mock
 * source unconditionally, so `VITE_DATA_MODE=server` still rendered a generated
 * event stream — while the page displayed "Realtime: connected".
 *
 * A resync is handled by reconnecting: the controller refetches the snapshot on
 * connect, which is the same path a first load takes. Doing anything cleverer
 * here would duplicate logic the controller already owns.
 */
function createServerNetworkSource(): GraphRealtimeSource {
  let lastSequence = 0;

  /**
   * Seeds the resume point from the snapshot, which is the whole reason a
   * resync ends anywhere.
   *
   * The first version reset `lastSequence` to 0 and reconnected. Subscribing
   * from 0 is what the server answers with `resync-required: behind-retention`
   * in the first place, so it reproduced the condition it was recovering from —
   * connect, resync, close, connect, roughly once a second, forever. A fresh
   * snapshot carries the revision it reflects, and subscribing from there is
   * the only value that does not immediately fall behind retention again.
   */
  async function loadSnapshot(topologyId: string) {
    const snapshot = await fetchTopologySnapshot(topologyId);

    lastSequence = snapshot.revision;

    return snapshot;
  }

  const transport = new ServerTopologyTransport({
    getAccessToken: () => tokenStorage.getAccessToken(),
    getLastSequence: () => lastSequence,
    onResyncRequired: () => {
      void loadSnapshot(networkTopologyId).then(() => transport.connect(networkTopologyId));
    },
  });

  transport.subscribe((event) => {
    lastSequence = Math.max(lastSequence, event.sequence);
  });

  return {
    topologyId: networkTopologyId,
    transport,
    loadSnapshot,
  };
}

export const networkRealtimeSource: GraphRealtimeSource = isServerBackedTopology
  ? createServerNetworkSource()
  : networkRuntimeSource;

export const networkRealtimeTransport = networkRuntimeSource.transport;
export const loadNetworkRuntimeSnapshot = networkRuntimeSource.loadSnapshot;
export const createNetworkEvent = networkRuntimeSource.createEvent;
