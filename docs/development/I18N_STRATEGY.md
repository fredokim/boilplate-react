# React i18n Strategy

## Rules

- Keep dictionaries typed with `as const`.
- Provide a fallback locale for unsupported locales.
- Format numbers and dates with `Intl`.
- Test dictionary key parity when adding locales.
- Use URL state for shareable locale only when product requirements need it.

## React Ownership

- Locale state can be local for isolated widgets.
- Locale should move to Zustand or route state only when multiple screens need it.
- Server responses should remain locale-independent unless the backend owns translations.

## Upgrade Path

```txt
src/core/i18n
  - locale utilities
  - dictionary parity tests
src/features/{feature}/i18n
  - feature dictionaries
```
