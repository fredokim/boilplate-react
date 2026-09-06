# React Boilerplate Architecture

## Boundaries

- `components/ui`: reusable atomic UI with no API, router, or store dependency.
- `components/states`: loading, empty, error, and result boundary UI.
- `features/*/views`: props-only feature UI.
- `features/*/containers`: query, mutation, route, store, and analytics wiring.
- `features/*/dto`: runtime API contracts.
- `core`: cross-feature infrastructure such as API, form, auth, observability, and failure models.

## UI Rules

- Put reusable controls in Storybook with at least default, loading/error/empty, and disabled states when relevant.
- Tailwind is used for component-level styling.
- SCSS is reserved for layout/page shells.
- Avoid importing feature logic into atomic UI.

## Data Rules

- API responses must pass DTO validation before reaching a view.
- Zod validates user input before mutations.
- TanStack Query owns server/cache state.
- Zustand owns session and client UI state.

## Mock Scenarios

Use `src/test/msw/scenarios.ts` for consistent API states:

- success
- empty
- invalid DTO
- backend error
- timeout

Tests and stories should reuse these scenarios instead of creating one-off mock shapes.
