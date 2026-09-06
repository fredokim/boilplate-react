# Prompt Playbook

Use these prompts to turn AI into a controlled React implementation partner.

## Feature Implementation

```txt
Implement this feature in the existing React boilerplate.

Goal:
- [Describe the user-visible result]

Scope:
- Only change [feature/files].

Constraints:
- Keep props-only UI in views.
- Put data loading, mutations, and routing orchestration in containers or hooks.
- Validate backend responses with DTOs before UI rendering.
- Reuse existing atomic UI and CSS/Tailwind patterns.
- Do not add dependencies unless justified.

Verification:
- Add focused tests or Storybook states.
- Run lint, typecheck, test, and build.

Before editing:
- Summarize affected files and the change plan.
```

## Senior FE Review

```txt
Review this change as a senior React frontend engineer.

Prioritize:
- Bugs
- View/container boundary violations
- DTO validation gaps
- State ownership mistakes
- Accessibility issues
- Missing tests
- Bundle or dependency risks

Return findings first with file/line references.
```

## Refactoring Slice

```txt
Refactor this component without changing behavior.

Goal:
- Separate pure view from data and browser-only logic.
- Extract testable logic.
- Keep public props stable.

Rules:
- Do this in one small slice.
- Add a regression test for preserved behavior.
- Stop after the first coherent refactor step.
```
