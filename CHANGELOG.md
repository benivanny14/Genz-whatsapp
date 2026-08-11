# Changelog

All notable changes to GENZ WhatsApp are recorded here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/): dates are approximate,
grouped by theme rather than strict semver, since this project tracks releases
by commit.

---

## [Unreleased] — Security hardening + frontend refactors (2026-08-11)

### Added
- **Server-side crash telemetry**: `CrashReport` model (90-day TTL),
  `POST /api/telemetry/crashes`, and `GET /api/admin/frontend-crashes`
  (recent 50 + grouped aggregate). `ErrorBoundary` now sends crash reports to
  the server (opt-in only, deduplicated per route+message, capped at 50
  entries) and the Admin Dashboard shows a "Frontend Crashes (server)" panel.
- **Opt-in crash reporting toggle** in GENZ Settings → Privacy
  ("Crash Reporting / Server-side crash analytics").
- **Admin crash-panel e2e** (`admin-crash-panel.spec.js`): provisions an
  AdminOwner + seeded crash, logs in through the real admin UI (username →
  TOTP → dashboard) and verifies the panel.
- **Admin auth integration test** (`adminAuthIntegration.test.js`): wrong
  password → 401 + failed attempt; step1 returns pre-2FA token only; step2
  requires a valid TOTP; refresh rotation invalidates used tokens.
- **Settings tabs e2e** (`settings-tabs.spec.js`): opens GENZ Settings and
  clicks through all six tabs.
- **Chat interactions e2e** (`chat-interactions.spec.js`): send → receive via
  socket, emoji picker, attachment menu.
- **Unit tests**: `crashReporting` (7), `chatTextHelpers` (8),
  `authSession`/`loginRedirect` (4), `telemetryController` (6).
- **CI test-DB guard** (`e2e/global-setup.js`): fail-fast when the e2e backend
  points at a database other than the isolated test DB.

### Changed
- **Socket handlers split into modules**: the 3.3k-line `socket/index.js` is
  now a thin registration layer over `socket/handlers/`
  (`messageHandlers`, `callHandlers`, `groupHandlers`, `statusHandlers`,
  `conversationHandlers`) with a shared `socket/context.js`. Behavior
  identical; tests green.
- **GENZSettings tabs extracted**: the 2304-line component now renders six
  boundary-wrapped child components (`ProfileTab`, `AppearanceTab`,
  `PrivacyTab`, `ModsTab`, `SocialTab`, `AdvancedTab`) fed by a `settingsCtx`
  bundle. Tab bodies verified line-for-line against the pre-extraction file.
- **ChatArea helpers extracted** (4926 → 4778 lines): pure helpers/constants
  moved to `src/utils/chatTextHelpers.js` (node-testable) and the mention
  renderer + `LinkPreviewCard` to `src/utils/chatText.jsx`.
- **Admin login redirect fixed**: the user API's 401 interceptor no longer
  bounces `/system-control-*` admin pages to the user `/login` — the admin
  login flow was previously unreachable for fresh visitors.
- **Playwright**: service workers blocked in config (the PWA "Update
  available" toast was covering the Send button and eating clicks).

### Security
- **No global socket broadcasts**: status views/likes/comments, block/unblock,
  presence, live-stream stop, and broadcast-list creation are emitted only to
  the specific users/rooms involved.
- **`call_user` hardened**: resolves the conversation, verifies both parties
  are participants, checks blocks, signals only the callee (never broadcast).
- **Block checks on `webrtc:offer`** and all call signaling.
- **Participant checks** on typing, recording, edit/delete message, star/pin,
  archive/mute/lock, custom roles, and join-group events.
- **Strict password policy** (min 12 chars + uppercase, lowercase, digit,
  special) on register, password change, and reset — weak passwords rejected,
  not warned.
- **JWT**: access tokens 15m, refresh tokens 7d, rotated and single-use via
  `refreshTokenVersion` (replay rejected).
- **Delete-for-everyone hard-delete**: content scrubbed immediately,
  document removed after 30 days (server-side sweep as restart-safe backstop).
  Account deletion erases the user's messages and orphan self-chats.
- **Media**: `/uploads` is same-origin only (`CORP: same-origin`), behind
  signed-URL/JWT middleware, magic-byte verified (`file-type`), production cap
  25MB.
- **Abuse reports** persisted to `AbuseReport` (pending/reviewed/resolved/
  dismissed) with admin-room socket notification.
- **Rate limits**: mass messages (20 recipients, 5/hour), admin routes (20 /
  15 min, localhost whitelisted).
- **Settings validation** (recursive allow-list), validated `businessWebsite`
  URLs, `trackProfileVisitors` consent, `onlineHistory` 30-day expiry, 7-day
  group invite code expiry, phone numbers removed from search results.
- **Process hardening**: `uncaughtException`/`unhandledRejection` exit the
  process; rate-limiter failures fail closed; `trust proxy` off by default;
  legacy hardcoded secrets/fallbacks removed.
- **Logging**: all `console.*` calls replaced with the winston logger
  (`logInfo`/`logError`/`logWarning`); fixed a latent runtime crash where
  call sites used `logWarn`, which winston never exported.

### Fixed
- Deleted-messages viewer and restore now show the original content, guarded
  by a per-route `<ErrorBoundary>` so a malformed payload can never blank the
  GENZ Mods page.
- GENZ Mods settings panels each wrapped in their own boundary; malformed
  `/api/genz-mods/settings` payloads degrade gracefully per panel.
- Admin dashboard shows per-route frontend crash counts.

---

## Prior history

See `git log` for earlier commits. Notable milestones:

- **Socket handler split** (`90f24c3`): 3.3k-line `socket/index.js` split into
  handler modules.
- **Security audit batch** (`204a1c8`): HATUA 1–4 hardening — targeted
  broadcasts, password policy, media CORS/auth, hard delete, JWT rotation,
  participant checks, error handlers, report storage, mass-message rate
  limits, atomic reactions, aggregation refactor, invite expiry, settings
  validation, website validation, phone-number removal, visitor consent,
  online-history TTL, DOMPurify, file validation, admin rate limiting.
- **Deleted-messages fixes** (`e04bc95`, `19fb273`, `5a0c8f8`): viewer shows
  and restores original content; per-route boundaries.
- **GENZ Mods panel extraction** (`a819787`): seven settings panels extracted
  into boundary-wrapped child components.
