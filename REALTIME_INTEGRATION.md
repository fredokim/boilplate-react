# Realtime Integration (React)

How the streaming layer binds to React, what this adapter has to get right, and what to
reach for when adding another realtime feature.

The same core exists in the Next and Vue boilerplates. Each has its own version of this
document, because the core is identical and the binding is not.

## The line that must not move

Everything under `src/features/visual-graph/realtime/` except `useTopologyRealtime.ts` is
plain TypeScript with no React import:

| File | Role |
| --- | --- |
| `types.ts` | Wire contract — events, snapshots, connection states |
| `transport.ts` | `TopologyRealtimeTransport` interface, `WebSocketTopologyTransport` |
| `runtimeStore.ts` | Buffering, coalescing, ordering, diagnostics |
| `controller.ts` | Connection lifecycle, flush timer, reconnect, resync |
| `mockTransport.ts`, `graphRuntimeSource.ts` | Development event sources |

All the correctness rules — ordering, duplicate suppression, coalescing, backpressure,
reconnect backoff, resync generation guards — live in the store and controller. **Do not
reimplement any of them in a hook.** If a rule needs changing, change it there and all
three boilerplates get it.

The store's contract with any framework is two methods:

```ts
subscribe(listener: () => void): () => void
getSnapshot(): RuntimeStoreSnapshot
```

That pair is chosen on purpose: it is exactly `useSyncExternalStore`'s contract, and it is
trivially adaptable to any other reactivity system.

## What to use

```ts
const runtime = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
```

**Use `useSyncExternalStore`.** Not `useState` + `useEffect(() => store.subscribe(...))`.
The manual version tears under concurrent rendering: two components reading the same store
in one render pass can see different values if an event lands mid-render.
`useSyncExternalStore` is the API React added to make that impossible.

**Use `useState` only for values React owns**, like the viewer's `runtimeFilter` or the
per-second rate counters derived on a timer. Those are view state, not stream state.

## What this adapter must manage

### 1. Snapshot identity

`getSnapshot` must return the *same object* until something actually changes:

```ts
getSnapshot = () => this.snapshot;   // a stored field, not a fresh object
```

Returning `{ ...this.snapshot }` or a computed projection would make React see a new value
on every read and re-render forever. If you need a derived shape, derive it in the
component with `useMemo`, never inside `getSnapshot`.

### 2. The flush timer is the only render driver

The enqueue path replaces `this.snapshot` to record diagnostics but **does not notify**.
Only `flush()` and `applySnapshot()` call `emit()`. That is what keeps a 500 events/second
stream at one render per 50ms tick instead of 500 renders per second.

`realtime/renderBatching.test.tsx` pins this: 200 enqueued events produce zero renders, and
one flush produces exactly one. If you add a code path that emits per event, that test
fails, and it should.

### 3. StrictMode idempotency

React 18 dev double-invokes effects: mount → cleanup → mount. The hook's effect calls
`controller.start()` and returns `controller.stop()`, so both must be safe to call twice:

- `start()` returns early unless `manuallyStopped` is true.
- `stop()` clears timers, unsubscribes, and disconnects, all guarded.
- `resync()` stamps a generation, so a snapshot resolving after `stop()` is discarded.

When adding a new realtime feature, mount it under `<StrictMode>` in its test. If the
adapter only works on a single mount, the test catches it before a user does.

### 4. Transport lifetime vs component lifetime

`networkRuntimeSource` is a module singleton, so remounting the viewer reuses one
transport. That is deliberate — a page-level stream should survive a re-render — but it
means `stop()` genuinely disconnects for everyone. If a future feature needs two
independent streams on one page, give each its own source via the `realtimeSource` prop
rather than sharing the singleton.

### 5. Page visibility

The controller drops the flush interval from 50ms to 250ms when `document.hidden`, and
resyncs on return. The hook owns the `visibilitychange` listener. Anything that starts a
stream must remove that listener on teardown, or a backgrounded tab keeps a dead
controller alive.

## Sharp edges

- **Deriving inside `getSnapshot`.** See above. The most common way to break this layer.
- **Subscribing before the store exists.** `useMemo` creates the store and controller from
  `graph`; if that memo's deps churn, you silently get a new store and lose all state.
  Keep the dep list to values that genuinely define a different stream.
- **Reading `runtime.diagnostics` for UI logic.** Those counters are for the debug panel.
  They change without notification, so a component that renders only when they change will
  not update on time.
- **Assuming a node has runtime state.** Until the first resync lands, `runtime.nodes` is
  empty and every node reads `unknown`. Views must render that state, not crash on it.

## Testing the adapter

Three layers, in order of cost:

1. **Store and controller** — plain unit tests, no React. `runtimeStore.test.ts`,
   `controller.test.ts`. Most realtime bugs should be caught here.
2. **Render behaviour** — `renderBatching.test.tsx`. Cheap, and pins the batching invariant.
3. **The real container** — mount `GraphViewerContainer` with no realtime mock and assert
   the stream connects, resyncs, and applies deltas. This is what proves the wiring, and it
   is the test to copy when adding a realtime feature.

Mock the canvas, not the stream. Mocking the hook proves nothing about the adapter.

## Production signals

`runtime.diagnostics` is the built-in telemetry. Each counter names the rule that fired:

| Counter | Climbing means |
| --- | --- |
| `staleIgnored` | Out-of-order delivery, or a resync racing deltas |
| `duplicatesIgnored` | The transport is redelivering |
| `unknownEntities` | Server knows topology the client does not — refetch the graph |
| `dropped` | Backpressure — the client cannot keep up with the stream |
| `coalesced` | Normal under load; the batching is doing its job |
| `reconnectCount` | Link instability |

Wire these into the observability adapters in `src/core/observability/` rather than
logging from the view.
