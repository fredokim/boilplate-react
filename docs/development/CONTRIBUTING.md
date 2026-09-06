# Contributing

## Before Coding

1. Check the target boundary: `ui`, `states`, `view`, `container`, `hook`, `dto`, or `core`.
2. Reuse existing components before adding new ones.
3. Keep API and store logic out of views and atoms.

## New Component Checklist

1. Create the component under `src/components/ui`.
2. Add a Storybook story with normal and edge states.
3. Add a focused test for rendering or interaction.
4. Keep props explicit and avoid `any`.

The generator does this baseline automatically:

```bash
npm run generate -- component SearchInput
```

## Verification

Run this before finishing a feature:

```bash
npm run lint
npm run typecheck
npm run test
npm run build-storybook
```
