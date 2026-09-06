# AI Development Guide

## Rules

- Do not use `any` unless the exception is documented in the same PR.
- Keep UI in `views` and reusable atoms. Keep data loading, routing, auth, and mutation logic in containers or hooks.
- Add DTO classes for every backend response and validate responses through `requestDto`.
- Use HOCs for cross-cutting screen behavior: auth, permission, analytics, and error boundaries.
- Prefer lazy route-level imports and named partial imports to keep initial JS small.
- Use Tailwind utilities in components. Use SCSS only for broad page/layout structure.
- Use Zod schemas for user input validation. Keep DTO classes for API response validation.
- Keep observability behind adapters. Do not import analytics/error vendors directly in UI.
- Add Storybook stories and focused tests when generating new components or features.

## New Feature Pattern

1. Add `features/{name}/dto`.
2. Add `features/{name}/api`.
3. Add query or mutation hooks.
4. Add props-only `views`.
5. Add `containers` that bind hooks to views.
6. Add Storybook stories for pure UI.
7. Add MSW handlers and focused tests.

## State and Validation

- Server/cache data: TanStack Query.
- Global UI/session state: Zustand.
- Form state: local state or react-hook-form when complexity grows.
- User input validation: Zod.
- API response validation: class-validator DTOs.

## Error Ownership

- DTO mismatch means frontend contract error.
- HTTP status or backend error envelope means backend/API error.
- Axios request without a response means network error.

## AI Workflow Docs

- `AI_WORKFLOW.md`: what AI drafts and what the developer owns.
- `PROMPT_PLAYBOOK.md`: reusable prompts for feature work, review, testing, and refactoring.
- `CODE_REVIEW_CHECKLIST.md`: senior React review checklist for AI-generated code.
- `AI_REFACTORING_CASE_STUDY.md`: before/after refactoring guidance.
- `PERFORMANCE_REPORT.md`: performance guardrails and commands.
- `I18N_STRATEGY.md`: locale ownership, fallback, and formatting rules.
