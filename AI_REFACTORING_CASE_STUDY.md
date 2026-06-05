# AI-Assisted Refactoring Case Study

## Goal

Document how AI can draft a refactoring while the developer controls React architecture and verification.

## Before

A legacy React feature often has these symptoms:

- API calls, filtering, state, labels, and rendering mixed in one component.
- Business labels embedded directly in JSX.
- Hard to test logic without mounting the full UI.
- Route-level bundle grows because everything sits in one file.

## Prompt Used

```txt
Refactor this React component without changing behavior.

Goal:
- Move pure rendering to a props-only view.
- Move orchestration to a container or hook.
- Extract filtering/status logic into testable functions.
- Add regression tests.

Constraints:
- Keep TanStack Query for server data.
- Use Zustand only for global UI/session state.
- Do not add dependencies.
```

## After

Expected split:

```txt
features/{name}/views
  - props-only UI
features/{name}/containers
  - hooks, query, mutation, orchestration
features/{name}/logic
  - pure functions with unit tests
features/{name}/dto
  - runtime API contracts
```

## Human Decisions

- Decide whether state is local, URL, TanStack Query, or Zustand.
- Decide which logic must be extracted before AI-generated changes continue.
- Keep dependency additions out unless the use case is proven.
- Require lint, typecheck, test, build, and E2E for user-facing changes.
