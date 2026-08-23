import { useSyncExternalStore } from 'react';
import { render, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { networkGraph } from '../network/networkGraph';
import { createGraphRuntimeSource } from './graphRuntimeSource';
import { TopologyRuntimeStore } from './runtimeStore';

// The flush timer must be the only thing that drives a render. The enqueue path
// replaces the snapshot object to record diagnostics but deliberately does not notify,
// so a 500 events/second stream still costs one render per 50ms flush.
describe('realtime render batching', () => {
  it('does not re-render for enqueue-only diagnostics churn', () => {
    const store = new TopologyRuntimeStore({
      knownNodeIds: networkGraph.nodes.map((n) => n.id),
      knownEdgeIds: networkGraph.edges.map((e) => e.id),
    });
    const source = createGraphRuntimeSource(networkGraph, { eventsPerSecond: 0 });

    let renders = 0;
    function Probe() {
      renders += 1;
      const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
      return <span>{snapshot.diagnostics.received}</span>;
    }

    render(<Probe />);
    const afterMount = renders;

    // Stream events without ever flushing: only the enqueue path runs, which
    // replaces the snapshot object but deliberately does not notify.
    act(() => {
      for (let i = 0; i < 200; i += 1) store.enqueue(source.createEvent(i));
    });

    expect(renders).toBe(afterMount);

    // A flush notifies, so exactly one render should follow.
    act(() => {
      store.flush();
    });

    expect(renders).toBe(afterMount + 1);
  });
});
