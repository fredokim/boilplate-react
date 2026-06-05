# React Performance Report

## Guardrails

- Lazy route imports keep initial JavaScript small.
- Props-only views reduce unnecessary orchestration inside UI components.
- TanStack Query prevents duplicate server-state fetching.
- Bundle size is checked with `npm run check:bundle`.
- Dependency size is checked with `npm run check:deps`.

## Review Checklist

- Avoid unbounded list rendering.
- Keep route-level code splitting intact.
- Memoize only when measurement or structure justifies it.
- Avoid adding large table/chart/date libraries without a replacement review.
- Keep mock/API scenarios available for performance-sensitive flows.

## Commands

```bash
npm run build
npm run perf:bundle
npm run check:bundle
npm run check:deps
```
