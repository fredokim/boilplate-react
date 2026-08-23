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

- Generator: `feature`, `component`, `dto`, and `hook` scaffolds.
- Component generator creates the component, story, and focused test.
- Contract generator creates DTO, form schema, state schema, mock data, and validation test.
- Form generator creates a props-only form view, Storybook stories, and a focused render test from the inferred schema type.
- Layout/page generators create reusable layout shells, page views, stories, and page specs.
- Automation checks enforce Storybook coverage, validation coverage, and mock registry presence.
- Bundle budget checks fail CI when generated JS chunks exceed the configured size cap.
- Dependency checks flag oversized runtime packages before they quietly become architectural defaults.
- Design tokens: CSS variables are split into color, spacing, and radius token files.
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

## More Docs

- `DESIGN_RATIONALE.md`: problem definition, component design method, key decisions, results, and retrospective.
- `VISUAL_GRAPH.md`: layer map, realtime pipeline, editing session model, and layout/performance strategy for the graph example.
- `ARCHITECTURE.md`: boundaries and ownership rules.
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
