# Visual Graph Feature

Reference for `src/features/visual-graph`, the boilerplate's largest worked example. It exists to show how a
non-trivial, interaction-heavy feature stays inside the project's boundary rules: props-only views, containers
that own orchestration, and framework-free domain modules that can be unit tested without React.

Route: `/examples/graph` (`routes/graphViewer.route.tsx`, lazy loaded, no auth).

## Layer map

| Directory | Owns | React? |
| --- | --- | --- |
| `model/` | Graph document shape, selection, interaction and route-query state, visual-state derivation | No |
| `editing/` | Undoable edit session, commands, clipboard, validation, serialization, repository, id factory | Hook only |
| `layout/` | Layout engines, dagre service, worker executor, stale-response coordinator | No |
| `network/` | Demo topology, large topology, route fixtures, realtime wiring | No |
| `realtime/` | Transport, runtime store, controller, mock source, `useTopologyRealtime` | Hook only |
| `performance/` | Search index, detail-level adapter, deterministic fixtures, measurement | No |
| `services/` | Route service interface and mock implementation | No |
| `components/` | `GraphCanvas` (React Flow adapter) and `GraphNodeCard` | Yes |
| `views/` | `GraphViewerView`, `GraphEditorView`, stories | Yes, props-only |
| `containers/` | `GraphViewerContainer` — the single place state, effects, and services meet | Yes |

Everything outside `components/`, `views/`, and `containers/` is plain TypeScript. That is what makes the
majority of this feature testable with `vitest` and no DOM.

## Realtime pipeline

Runtime health is **not** part of the graph document. `networkGraph` describes topology (hostname, address,
location); status and metrics arrive separately as a stream. A node whose realtime state never arrives renders
as `unknown` rather than blocking the topology from drawing.

```
transport ──events──▶ store.enqueue ──coalesce──▶ [pending]
                                                    │ flush timer (50ms / 250ms hidden)
                                                    ▼
                          store.flush ──▶ snapshot ──▶ useSyncExternalStore ──▶ view
controller ──resync──▶ store.applySnapshot
```

### Modules

- **`realtime/types.ts`** — the wire contract. `TopologyRealtimeEvent` is a discriminated union over
  `NODE_STATUS_CHANGED`, `EDGE_STATUS_CHANGED`, `NODE_METRIC_UPDATED`, `EDGE_METRIC_UPDATED`, each carrying
  `eventId`, `entityId`, `sequence`, and `timestamp`.
- **`realtime/transport.ts`** — the `TopologyRealtimeTransport` interface plus `WebSocketTopologyTransport`, a
  real implementation that takes a socket factory so it can be tested without a server.
- **`realtime/runtimeStore.ts`** — `TopologyRuntimeStore`. Buffers, coalesces, and applies events; maintains the
  status summary, per-node metric history, and diagnostics. Exposes `subscribe`/`getSnapshot` for
  `useSyncExternalStore`.
- **`realtime/controller.ts`** — `TopologyRealtimeController`. Owns connection lifecycle, the flush timer,
  reconnect backoff, and resync.
- **`realtime/mockTransport.ts`** — `MockTopologyTransport`, an in-memory transport with `startStress` for
  load simulation and `simulateDrop` for disconnect scenarios.
- **`realtime/graphRuntimeSource.ts`** — builds a transport, a snapshot provider, and an event generator from
  any `GraphDocument`, so the four-node demo and the 2,000-node fixture share one mock server. Supports
  scripted `initialEvents` and a `disconnectAfterMs` drop timer.
- **`realtime/useTopologyRealtime.ts`** — wires store and controller to React and exposes `runtime`,
  `connectionState`, `isNodeStale`, `selectedMetricHistory`, and `resync`.

### Correctness rules

These are the properties the realtime tests defend, and the reason the layer is not just `setState` in an
effect:

- **Ordering.** Every entity carries a monotonic `sequence`. An event whose sequence is at or below the applied
  state is dropped as stale — both on enqueue and again on flush, because a resync can land in between.
- **Duplicates.** `eventId` is remembered in a bounded LRU (5,000 entries). A redelivered event is counted and
  discarded.
- **Coalescing.** Pending events are keyed by `entity:id:kind`, so a burst of metric updates for one node
  collapses to the newest, while a status change for the same node survives alongside it.
- **Backpressure.** The pending map is capped (2,000). Overflow drops the oldest and increments `dropped`,
  which is surfaced in the debug panel rather than hidden.
- **Batching.** The store flushes on a timer, not per event — 50ms visible, 250ms when the page is hidden. One
  React render per flush regardless of event rate.
- **Unknown entities.** Events for ids absent from the graph are counted and ignored, so a server that knows
  about more topology than the client does not corrupt the view.
- **Reconnect.** Exponential backoff with jitter (`0.8x`–`1.2x`) up to 30s, so many clients do not retry in
  lockstep after a server restart.
- **Resync races.** `resync()` stamps a generation before awaiting the snapshot and discards the result if a
  newer resync or a `stop()` happened while it was in flight.
- **Subscribe before snapshot.** `start()` subscribes to the transport before loading the snapshot; sequence
  checks then preserve any deltas that arrive during the load.

### Diagnostics

`runtime.diagnostics` accumulates `received`, `applied`, `coalesced`, `duplicatesIgnored`, `staleIgnored`,
`unknownEntities`, `dropped`, `flushCount`, `totalBatchSize`, `reconnectCount`, `bufferSize`, and `lastResync`.
The viewer renders these plus a derived per-second rate in the "Realtime debug" card. Every counter above
corresponds to a rule in the previous section — if a number climbs unexpectedly, it names the rule that fired.

## Editing

`editing/graphEditorSession.ts` models edit mode as a discriminated union rather than a `isEditing` boolean:
a session is either viewing (`savedGraph` only) or editing (`savedGraph`, `draftGraph`, `past`, `future`,
`dirty`). Illegal states — a draft with no edit mode, undo history while viewing — are unrepresentable.

- Commands in `editing/graphCommands.ts` are pure `(graph, args) => { graph, changed, error? }`. They never
  touch React, and `changed: false` is how a no-op is reported instead of silently returning a new object.
- History is capped at `GRAPH_HISTORY_LIMIT = 50`. Undo/redo move entries between `past` and `future`.
- `editing/graphValidation.ts` splits structural validation (synchronous, local) from
  `NetworkValidationService` (async, injectable) so a real backend check can replace the mock.
- `editing/graphSerialization.ts` versions the export (`GRAPH_SCHEMA_VERSION`) and validates imports with Zod,
  returning `{ success: false, errors }` rather than throwing.
- `editing/graphIdFactory.ts` and `editing/graphRepository.ts` are injected, which is what makes the editor
  deterministic under test.
- `editing/useGraphEditorShortcuts.ts` binds undo/redo/copy/paste/duplicate/delete/escape; `GraphEditorView`
  is its only caller.
- The container installs a `beforeunload` guard while a dirty draft exists, and `cancelDraft` confirms first.

## Layout

`layout/graphLayout.ts` defines `GraphLayoutEngine`; `providedPositionLayout` is the default and simply trusts
the positions already on the document. Automatic layout goes through dagre:

`layoutCoordinator` → `createWorkerLayoutExecutor()` → `layout.worker.ts` (dagre in a Web Worker) → positions.

Two failure paths are handled explicitly: if `Worker` is undefined (SSR, older test environments) or the worker
errors, `fallbackLayoutExecutor` runs dagre on the main thread. The coordinator also tags each request so a
slow layout that resolves after a newer one returns `{ status: 'stale' }` and is discarded instead of snapping
the graph back.

## Performance

- `performance/graphSearchIndex.ts` builds a flattened id/label/metadata index once per graph; the viewer
  searches it behind `useDeferredValue` so typing stays responsive on large topologies.
- `performance/graphViewAdapter.ts` derives a detail level from zoom (`compact` under 0.65, `detailed` over
  1.2). Compact hides type labels and runtime badges; edge labels are also dropped past 1,000 edges.
- `GraphNodeCard` is memoized with an explicit comparator over the fields that actually affect its output,
  which matters when a metric burst touches hundreds of nodes.
- `performance/largeGraphFixture.ts` generates deterministic 50 / 500 / 2,000-node graphs — deterministic so
  Storybook and tests compare like with like across runs.
- `performance/performanceMetrics.ts` provides `measureOperation` for timing in tests and the debug panel.

## Storybook scenarios

`views/GraphViewerView.stories.tsx` covers route success, no-route, loading, and error states; edit mode,
dirty drafts, and validation failures; large topologies; and the realtime scenarios that map directly to the
correctness rules above:

| Story | Exercises |
| --- | --- |
| `RealtimeNormal` | 10 events/s baseline |
| `RealtimeHighFrequency` | 500 events/s on a 500-node graph — coalescing and batching |
| `NodeFailure` / `EdgeFailure` | Status transitions through warning, critical, offline |
| `DuplicateEvents` | Same `eventId` twice — `duplicatesIgnored` |
| `OutOfOrderEvents` | Sequence 10 then 9 — `staleIgnored` |
| `Disconnect` / `Reconnect` | Timed drop and backoff |
| `ReconnectAndResync` | Snapshot reconciliation after reconnect at 100 events/s |
| `LargeRealtimeTopology` | 2,000 nodes at 500 events/s |

## Extending it

- **Real backend.** Replace `MockTopologyTransport` with `WebSocketTopologyTransport`, passing a socket
  factory. Nothing above the transport changes.
- **Real snapshots.** Swap `loadSnapshot` for an API call returning `TopologyRuntimeSnapshot`.
- **Real persistence.** Implement `GraphRepository` against your API instead of `createMemoryGraphRepository`.
- **Real validation.** Implement `NetworkValidationService`.
- **Real routing.** Implement `GraphRouteService`.

Each of these is a constructor argument or container prop, not an import to rewrite.

## Merge note (2026-08-23)

Realtime topology monitoring was implemented twice in parallel on this branch under different filenames. The
resolution, recorded here because the file layout would otherwise look arbitrary:

- **Kept** the `types` / `transport` / `runtimeStore` / `controller` split for its dependency injection, real
  WebSocket transport, reconnect jitter, and resync generation guard.
- **Dropped** the parallel `topologyRealtime` / `eventBuffer` / `runtimeState` / `realtimeController` modules.
- **Ported** the discarded side's graph-driven mock server onto the surviving transport interface as
  `graphRuntimeSource.ts`, because the large-graph performance work needs an event source that can be driven
  from an arbitrary `GraphDocument` rather than a fixed four-node demo.
- **Moved** node status out of `NetworkNodeMetadata`. Runtime status streams; it is not static topology data.

Verified after merge: `typecheck`, `lint`, `test` (21 files, 99 tests), `check:ai`, `check:automation`,
`check:deps`, `build`, and `check:bundle` all pass.
