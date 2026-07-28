# @creno/react

React component for [Creno](https://crenoapp.com)'s scheduling API, a real month-calendar date picker, time-slot list, optional service-type menu, themeable via `--pbw-*` CSS custom properties.

```tsx
import { BookingWidget } from "@creno/react";
import "@creno/react/style.css";

<BookingWidget apiUrl="https://api.crenoapp.com" apiKey="pk_live_..." />
```

## Language

`lang` selects a built-in translation, `"fr"` and `"en"` ship real dictionaries (see `src/locales/`); any other value (or omitting it) falls back to English. This isn't just cosmetic: whatever `lang` the widget renders with is sent along with the booking and persisted on `bookings.lang`, which is what the API uses to send the confirmation/notification emails (both customer- and owner-facing) in the matching language. `formatLocale` (date/time formatting, e.g. `"fr-CA"`) defaults sensibly from `lang` if not set explicitly. `labels` still works as a full or partial override on top of whichever locale `lang` resolves to, that's the escape hatch for a language that doesn't have a built-in dictionary yet, or for wording tweaks (jams-garage uses this).

Adding a third built-in language later is one new file in `src/locales/` plus a matching dictionary in the API's `modules/email/templates.ts`, no prop or schema changes.

## Bot protection

`turnstileSiteKey` renders a [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) challenge on the details step and blocks submission until it's solved, omit it and the widget behaves exactly as before (no challenge, nothing blocks submission). Requires a matching `TURNSTILE_SECRET_KEY` on the API side to actually be enforced server-side; with the widget sending a site key but the server unconfigured, submissions still succeed (server-side verification is a no-op until its own key is set, see the API README).

## Why this depends on `preact`

This package is authored against React, and `react`/`react-dom` are peer dependencies, normal React consumers (jams-garage, any Next/Astro/CRA app) never touch Preact.

`preact` is listed as a **direct** dependency purely so `@platform/embed-widget` can build. That package imports this one's *source* (not `dist/`) and aliases `react` → `preact/compat` via `@preact/preset-vite` to produce a tiny framework-agnostic `<script>` bundle from the exact same component. Under pnpm's strict per-package `node_modules`, the resulting `preact/jsx-runtime` import has to resolve from wherever this package's source physically lives on disk, not from whichever package's build happens to be driving the bundle, so `preact` needs to be an installable dependency *here*, even though nothing in this package's own code imports it directly. If this package's own React-targeting build (`pnpm build`) ever complains about it being unused, that's expected; it's a build-time-only requirement for the sibling embed package.

## Error handling

`<BookingWidget>` handles its own errors in the UI. If you're calling the underlying client directly (e.g. via `createApiClient` for a custom flow), every non-2xx response raises a specific error class:

```tsx
import { createApiClient, CrenoConflictError, CrenoPlanLimitError } from "@creno/react";

try {
  await api.createBooking({ /* ... */ });
} catch (err) {
  if (err instanceof CrenoConflictError) {
    // that slot was just taken, re-fetch availability and retry
  } else if (err instanceof CrenoPlanLimitError) {
    // err.limitType, err.plan
  } else {
    throw err;
  }
}
```

| Class | HTTP status |
|---|---|
| `CrenoAuthenticationError` | 401 |
| `CrenoForbiddenError` | 403 |
| `CrenoNotFoundError` | 404 |
| `CrenoValidationError` | 400 |
| `CrenoConflictError` | 409 |
| `CrenoPlanLimitError` | 402 (has `.limitType` and `.plan`) |
| `CrenoRateLimitError` | 429 |
| `BookingApiError` | base class, thrown for network errors, 5xx, anything else |

Matches the [Python](../python-sdk) and [Node](../node-sdk) SDKs' exception taxonomy one-for-one.

## License

[MIT](./LICENSE). See [CHANGELOG.md](./CHANGELOG.md) for release history and the repo root's [SECURITY.md](../../SECURITY.md) to report a vulnerability.
