# React Boilerplate

React web boilerplate focused on strict TypeScript, DTO validation, UI/logic separation, lazy routing, and testable atomic UI.

## Stack

- React + Vite + TypeScript strict mode
- TanStack Query for server state
- Zustand for session/client state
- Axios + class-transformer + class-validator DTO parsing
- React Router lazy routes
- Tailwind CSS for components and SCSS for page/layout structure
- Storybook, Vitest, Testing Library, MSW, Playwright config

## Structure

- `src/components`: atomic UI and reusable state components
- `src/features/*/views`: props-only UI
- `src/features/*/containers`: hooks, routing, mutation, and orchestration
- `src/features/*/dto`: API contracts validated at runtime
- `src/hoc`: cross-cutting wrappers such as auth, permission, analytics, and error boundary
- `src/hooks`: reusable browser, scroll, form, breakpoint, and webview bridge helpers
- `src/core`: API client, analytics adapter, token storage, and failure model

## Commands

```bash
npm run dev
npm run check:ci
npm run storybook
npm run perf:bundle
npm run check:bundle
npm run e2e
npm run check:automation
npm run generate -- feature user
npm run generate -- contract product
npm run generate -- form product
npm run generate -- layout admin-shell
npm run generate -- page orders list
```

## Added Architecture Standards

- Generator: `feature`, `component`, and `dto` scaffolds. A generated feature is reachable, tested, and covered by `check:generators`.
- Component generator creates the component, story, and focused test.
- Contract generator creates DTO, form schema, state schema, mock data, and validation test.
- Form generator creates a props-only form view, Storybook stories, and a focused render test from the inferred schema type.
- Layout/page generators create reusable layout shells, page views, stories, and page specs.
- Automation checks enforce Storybook coverage, validation coverage, and mock registry presence.
- Bundle budget checks fail CI when generated JS chunks exceed the configured size cap.
- Dependency checks flag oversized runtime packages before they quietly become architectural defaults.
- Design tokens: colour, spacing, radius, and shadow variables are generated from a source shared with the Vue and Next.js boilerplates.
- Date utilities: common date parsing, formatting, ranges, and relative labels live in `src/core/date/date.ts`.
- Form validation: Zod validates user input before mutations.
- Common UI: inputs, select, checkbox, radio group, modal, tabs, toast, table, and pagination are Storybook-ready.
- API mocks: MSW scenarios cover success, empty, invalid DTO, backend error, and timeout states.
- Observability: logger, error reporter, and performance reporter are adapter-based no-ops.
- Accessibility: `vitest-axe` checks base UI components.
- E2E: Playwright smoke tests cover anonymous redirect and login form rendering.

## Mock APIs

The Vite dev app starts MSW automatically in development. Dummy data lives in `src/test/fixtures/dummyData.ts` and is served through:

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/auth/session`
- `GET /api/users`
- `GET /api/users/:id`
- `GET /api/dashboard/summary`
- `GET /api/notifications`
- `GET /api/audit-logs`

MSW scenarios in `src/test/msw/scenarios.ts` can switch these APIs to success, empty, invalid DTO, backend error, or timeout responses.

## Backend

The backend is a separate repository: [`fredokim/boilplate-server`](https://github.com/fredokim/boilplate-server),
a NestJS + PostgreSQL + Prisma service shared by this boilerplate, the Next one,
and the Vue one. It used to live in `server/` here; it moved out so the three
frontends could depend on one server rather than each carrying a copy.

Nothing in this repository builds, lints, or tests it. What stays here is the
frontend's side of the contract.

| Command | Does |
| --- | --- |
| `npm run dev:server-mode` | Run the frontend against a real server instead of MSW |
| `npm run contract:sync` | Copy the server's `openapi.json` into `contracts/` |
| `npm run check:contract` | Frontend assumptions vs that spec |
| `npm run check:all` | `check:ci` and the contract test |

`contract:sync` reads `../boilplate-server/openapi.json` by default and honours
`SERVER_REPO` when the checkout is somewhere else:

```bash
SERVER_REPO=/path/to/boilplate-server npm run contract:sync
```

`contracts/openapi.json` is committed, so the contract test runs without the
server present. Regenerating it is the server repository's job — see its README
for how to run it, seed a demo account, and apply migrations.

### One switch decides where data comes from

`VITE_DATA_MODE` is `mock` (the default) or `server`. It governs MSW, the
dashboard repositories, the topology transport, and the chat transport together —
three separate switches was three ways to end up half-connected, with the
dashboard on the server and chat still answering from a mock.

**A production build with `VITE_DATA_MODE=mock` refuses to start.** A deployed app
running on mocks looks healthy while every number on screen is fabricated, and
nothing in the UI reveals it.

The per-module variables (`VITE_DASHBOARD_REPOSITORY`, `VITE_TOPOLOGY_SOURCE`,
`VITE_CHAT_SOURCE`) still work as an override within the chosen mode, for
bringing one module up against a real server while the rest stay mocked.

```bash
npm run dev              # mocks, no backend needed
npm run dev:server-mode  # the real server
```

### Auth

`POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, and
`GET /api/auth/session`. The login and session responses match the frontend's
existing `LoginResultDto` and `SessionDto` exactly, so the client DTOs need no
change to talk to the real server.

The server requires `JWT_SECRET` and has no default for it, and it seeds no
account unless `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are set. Both are
configured in the server repository, not here.

### Dashboard

The four widget-data routes the app already calls are served unchanged, including
the legacy `metric` parameter. Dashboard definitions and per-user personalization
(presets, hidden widgets, overrides) persist in PostgreSQL with optimistic
locking.

The frontend keeps localStorage and memory persistence as the default. Opt into
the server with:

```bash
VITE_DASHBOARD_REPOSITORY=server npm run dev
```

### Graph and realtime topology

Graph structure persists in PostgreSQL with an optimistic lock; runtime status and
metrics stream over a WebSocket at `/api/topology`, ordered by a per-graph
sequence and replayable after a disconnect.

The frontend keeps the mock transport as the default. Opt into the real one with:

```bash
VITE_TOPOLOGY_SOURCE=server npm run dev
```

The runtime store, controller, batching, coalescing, and backoff are untouched —
only the transport and snapshot source are swapped.

### Live experience and chat

Broadcast metadata, short-lived playback grants, and a persisted chat with
sequence-ordered history, idempotent sending, and moderation. The server is a
control plane — it never encodes or serves media, and the manifest URL is only
handed out through an expiring playback session.

The frontend keeps the mock chat transport as the default:

```bash
VITE_CHAT_SOURCE=server npm run dev
```

HLS engine selection and live-edge calculation stay on the frontend; the server
only states `sourceType` and `dvrEnabled`.

### Health endpoints and the MSW contract

The existing mock for `GET /api/health` returns `{ success: true, data: { status: "ok" } }`.
The server keeps that field and meaning and adds to it:

```jsonc
{ "success": true, "data": {
  "status": "ok",              // or "degraded" when a dependency is down
  "uptimeSeconds": 12.5,
  "checks": { "database": { "status": "up", "latencyMs": 1.4 } }
} }
```

Anything reading `data.status` works against either. `"degraded"` is the one value
the mock never produces — the mock is always healthy.

`/api/health/live` and `/api/health/ready` are new and have no mock counterpart.

## More Docs

- `DESIGN_RATIONALE.md`: problem definition, component design method, key decisions, results, and retrospective.
- `VISUAL_GRAPH.md`: layer map, realtime pipeline, editing session model, and layout/performance strategy for the graph example.
- `REALTIME_INTEGRATION.md`: how the streaming layer binds to React, and what the adapter must get right.
- `ARCHITECTURE.md`: boundaries and ownership rules.
- [`boilplate-server`](https://github.com/fredokim/boilplate-server): the shared backend — setup, request flow, and envelope ownership live in its own README and ARCHITECTURE.
- `CONTRIBUTING.md`: checklist for new UI/features.
- `DEPENDENCY_STRATEGY.md`: package replacement and dependency review rules.
- `AI_DEVELOPMENT_GUIDE.md`: rules for AI-assisted implementation.
- `AI_WORKFLOW.md`: AI-assisted React workflow and verification gates.
- `PROMPT_PLAYBOOK.md`: prompts for implementation, review, refactoring, and testing.
- `CODE_REVIEW_CHECKLIST.md`: review checklist for AI-generated React code.
- `AI_REFACTORING_CASE_STUDY.md`: React before/after refactoring playbook.
- `PERFORMANCE_REPORT.md`: route, bundle, dependency, and rendering guardrails.
- `I18N_STRATEGY.md`: typed dictionary, fallback locale, and formatting strategy.
- `AI_CHANGELOG.md`: AI-assisted work log and verification notes.

## Design tokens

Colours, spacing, radii, and shadows come from `tokens/tokens.json`, which the
React, Next.js, and Vue boilerplates share. The CSS and TypeScript files that
declare them are generated; editing one is undone by the next build.

```bash
# after editing tokens/tokens.json
npm run tokens:build
```

`npm run check:tokens` renders the outputs and compares them against what is
committed, failing with the file, line, and both values when they differ. It
runs as part of `check:ci`. It compares rather than regenerating on purpose: a
check that rewrites the file it is checking cannot fail.

A token may carry a dark value under `$extensions.mode.dark`. Nothing declares
one yet, so no `prefers-color-scheme` block is emitted; adding one value is
enough to produce the block.

`TOKEN_INVENTORY.md` in the React repository records what the three sets looked
like before they were merged, including two tokens that were deliberately not
merged.

## Feature generator

```bash
npm run generate:feature -- billing-report          # view, story, test, container, route
npm run generate:feature -- billing-report --api    # ...plus api module, DTO, and query hook
```

`FEATURE_CONTRACT.md` records what a generated feature contains and why, derived
from the features that already exist rather than invented.

The api module is behind `--api` because a generated one calls a URL derived
from the feature name, and `npm run check:contract` reads those URLs and
compares them against the server's published spec — so scaffolding with an api
module turns the contract check red immediately. Asking for it makes that a
choice rather than a surprise.

`npm run check:generators` runs the generator and checks its output against the
contract; it is part of `check:ci`. Regenerating over an existing feature
refuses rather than overwriting.
