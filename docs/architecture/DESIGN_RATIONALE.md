# Design Rationale

This document explains the problem definition, component design method, key decisions, results, and retrospective behind the React boilerplate.

## Problem Definition

The React boilerplate was built to solve frontend problems that commonly appear after a Vite/React app grows beyond the first release.

- API response types exist at compile time, but real payloads can still drift at runtime.
- Views often mix data fetching, mutation handling, filtering, label mapping, and rendering.
- Server state and client UI state are frequently stored in the same place.
- Lazy routing, auth guards, analytics, and error boundaries are added inconsistently.
- Loading, empty, error, success, and invalid DTO states are not always designed together.
- Storybook, MSW, accessibility tests, and bundle checks are often added too late.

The goal was to turn these recurring decisions into a repeatable project baseline.

## Component Design Method

The boilerplate separates UI from orchestration.

| Layer | Responsibility |
| --- | --- |
| Route | Lazy route loading and route-level composition |
| Container | Query, mutation, routing, and orchestration |
| View | Props-only rendering and Storybook-ready UI |
| Hook | Reusable browser or feature behavior |
| HOC | Cross-cutting wrappers such as auth, analytics, permission, and error boundary |
| DTO/API | Runtime contract validation and typed API access |
| UI Component | Reusable controls and state components |

Reference pattern:

```txt
src/features/example/
  api/
    example.api.ts
  containers/
    ExampleContainer.tsx
  views/
    ExampleView.tsx
  hooks/
    useExampleQuery.ts
  dto/
    Example.dto.ts
```

The view should remain easy to render in Storybook and tests without requiring a real router, API, or global store.

## Key Decisions

### 1. Use DTO validation at the API boundary

The API client validates response envelopes and DTO classes before returning data to features.

Why:

- Runtime contract drift should fail near the API boundary.
- Views should not carry repetitive null/undefined defense logic.
- MSW scenarios can test success, empty, invalid DTO, backend error, and timeout states.

### 2. Use TanStack Query for server state and Zustand only for client state

Server state is fetched and refreshed through TanStack Query. Zustand is reserved for session/client UI state.

Why:

- Cache, invalidation, and refetch logic belong with server state tooling.
- Modal, drawer, toast, and selected tab state should not be mixed with backend data.
- Global state stays smaller and easier to audit.

### 3. Keep views props-only

Feature views receive data and callbacks as props. Containers own queries, mutations, route params, and orchestration.

Why:

- Views are easier to test.
- Storybook can document loading, empty, error, and success states.
- UI refactoring does not require changing API code.

### 4. Add automation and generators early

Generators create feature, contract, form, layout, and page files that follow the same boundaries.

Why:

- The project can scale without each feature inventing its own structure.
- Generated tests, stories, and validation files keep quality expectations visible.
- CI can check architecture conventions with repeatable commands.

## Results

- Strict TypeScript React/Vite foundation.
- DTO-validated API client with MSW scenarios.
- View/container separation across feature modules.
- Storybook-ready UI components and state components.
- Vitest, Testing Library, accessibility checks, Playwright config, bundle budget, and dependency checks.

## Retrospective

What worked:

- View/container separation makes UI behavior easier to explain and verify.
- DTO validation gives clearer ownership for contract failures.
- MSW scenarios make error and edge states visible before backend integration.
- Generators reduce drift across new features.

Trade-offs:

- The pattern can be heavier than necessary for a small one-screen prototype.
- Maintaining stories and DTO tests requires discipline.
- HOCs should stay limited to cross-cutting concerns, or composition can become hard to trace.

Next improvements:

- Add lightweight, standard, and strict presets.
- Expand accessibility examples for complex form and table flows.
- Add more route-level performance examples.
- Provide a documented migration path from a simple feature to a fully generated feature.
