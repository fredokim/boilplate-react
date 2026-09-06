# AI-Assisted React Code Review Checklist

## Boundaries

- Props-only UI stays in `views`.
- Data loading, mutation, auth, routing, and orchestration stay in containers, hooks, or HOCs.
- DTO validation happens before UI receives backend data.
- Atomic components do not own API calls or business flow.

## State

- TanStack Query owns server/cache data.
- Zustand owns global UI/session state.
- URL state is used for shareable filters.
- Local state is used for component-only interactions.

## UI Quality

- Existing atomic UI and state components are reused.
- Loading, empty, and error states are represented.
- Interactive controls have accessible names and keyboard behavior.
- Storybook covers reusable UI variants.

## Performance

- Lazy route boundaries are preserved.
- New dependencies are justified and checked.
- Lists have stable keys and bounded rendering.
- Expensive input handlers are avoided or measured.

## AI-Specific Review

- The change does not invent requirements.
- The implementation follows repository conventions.
- The diff is smaller than the problem it solves.
- Tests cover AI-generated branches or extracted logic.
- Verification commands are reported.
