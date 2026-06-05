# Dependency Strategy

This boilerplate keeps dependencies small, explicit, and easy for AI-assisted development to reason about.

## Keep

- `vite`: primary React bundler. It keeps the web boilerplate fast, simple, and compatible with Storybook and Vitest.
- `@vitejs/plugin-react`: required React transform plugin.
- `@tanstack/react-query`: server state, cache, retry, and request lifecycle.
- `zustand`: small client/session state.
- `axios`: retained while request/response interceptors are first-class architecture.
- `class-validator`, `class-transformer`, `reflect-metadata`: retained for decorator DTO runtime validation.
- `zod`: form and local state validation.
- `tailwindcss`, `sass`: utility-first components plus SCSS layout/page structure.
- `msw`: mock API scenarios for local and Storybook workflows.

## Avoid

- Adding a second form engine unless it replaces the current schema-inferred controlled form pattern.
- Adding UI kits that hide atomic component ownership.
- Adding analytics, logging, or error reporting vendor SDKs directly to UI code. Use adapters.
- Adding fetch wrappers beside the existing API client.
- Adding date libraries for basic formatting, ranges, and relative labels. Use `src/core/date/date.ts` first.

## Replace Later

- `axios` can be replaced by native `fetch` only if interceptor behavior, typed failures, and cancellation are preserved.
- Decorator DTO validation can be replaced by schema-first validation only if API response typing, error ownership, and generator output are migrated together.
- Tailwind v4 migration should be done as a dedicated styling migration, not mixed with feature work.

## Review Checklist

- Run `npm run check:deps` before adding a runtime dependency.
- Runtime dependencies above 6MB installed size need a written reason or a lighter alternative.
- Is the package used in production code, generator output, tests, or Storybook?
- Does an existing framework primitive already solve it?
- Does it increase client bundle size?
- Can it be lazy-loaded or kept in dev dependencies?
- Is there a typed adapter boundary so it can be swapped later?
