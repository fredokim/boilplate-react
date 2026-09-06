# AI-Assisted React Frontend Workflow

This workflow defines how AI is used in this React boilerplate without giving up engineering ownership. AI can draft UI,
tests, DTOs, and refactoring slices; the developer owns state boundaries, API contracts, accessibility, performance, and
release risk.

## Operating Principles

- Keep UI rendering in `views` and orchestration in `containers`, hooks, or HOCs.
- Validate backend responses with DTOs before feature UI receives data.
- Treat AI output as draft code until lint, typecheck, tests, build, and reviewer checks pass.
- Prefer small, reversible changes over broad rewrites.
- Reuse existing atomic UI, state components, MSW scenarios, and Storybook patterns.

## AI-Owned Draft Work

- Generate props-only view components from existing UI patterns.
- Draft DTOs, Zod schemas, mock payloads, and focused tests.
- Expand Storybook states for loading, empty, error, and populated cases.
- Identify repeated logic and propose refactoring slices.
- Draft Playwright scenarios for high-risk flows.

## Developer-Owned Decisions

- View/container/hook boundary placement.
- State ownership: TanStack Query cache, Zustand global state, URL state, or local state.
- API contract shape and backwards compatibility.
- Accessibility acceptance criteria.
- Performance tradeoffs such as lazy routes, bundle splitting, memoization, and dependency cost.
- Rollout risk and operational monitoring.

## Verification Gate

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run e2e
npm run check:automation
```

For dependency, Storybook, or bundle-related changes:

```bash
npm run check:deps
npm run check:bundle
npm run build-storybook
```

## Portfolio Summary

AI is used to accelerate implementation drafts, while senior frontend decisions remain under human review: state
ownership, API contract validation, UI boundaries, performance, accessibility, and verification.
