# Changelog

## [0.1.2] - 2026-08-03

### Changed
- Dropped the reference to a WordPress plugin from the `clientLibrary` doc
  comment. It shipped in `dist/types.d.ts`, so editors showed it on hover for
  a plugin that no longer exists. No API or behaviour change.

## [0.1.1] - 2026-07-28

### Changed
- Wording cleanup in the README and package description, no functional changes.

## [0.1.0] - 2026-07-28

### Added
- `<BookingWidget>` component: month/week calendar, service-type picker
  (auto-hidden for tenants with 0-1 active service types), Cloudflare
  Turnstile support, bilingual (en/fr) built-in strings with a `labels`
  override for full customization.
- `onBooked` callback, fired with the created booking after a successful
  reservation.
- Typed API error classes (`CrenoConflictError`, `CrenoPlanLimitError`,
  `CrenoRateLimitError`, `CrenoValidationError`, `CrenoNotFoundError`,
  `CrenoForbiddenError`, `CrenoAuthenticationError`), all extending the
  existing `BookingApiError` and now exported from the package's public
  entry point, matches the same error taxonomy as the Python and Node
  SDKs.
- Every request now identifies itself via `X-Client-Library: react`.

### Changed
- Relicensed from a custom usage-restricted license to **MIT**.
