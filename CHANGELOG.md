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
  `authSession`/`loginRedirect` (4), `telemetryController` (6),
  `privacyEngine` (34 — full privacy permission matrix), `privacySelectors`
  (11 — `PrivacyPermissionSelector` + `ContactSelectorScreen` via Vite SSR).
- **CI test-DB guard** (`e2e/global-setup.js`): fail-fast when the e2e backend
  points at a database other than the isolated test DB.
- **Dependency upgrade**: `vite@5` → `vite@8.2.1` + `@vitejs/plugin-react@6`
  (Node 22 required) — frontend `npm audit` is now **0 vulnerabilities**
  (previously 1 high + 1 moderate from `vite`/`esbuild`); build, dev server,
  and all 71 frontend tests verified on vite 8.
- **vite 8 build clean-up**: removed dead `React.lazy` import of
  `emoji-picker-react` in ChatArea and converted ineffective dynamic imports
  (authFetch/resolveApiBase/indexedDB/notificationService) to static — all
  `INEFFECTIVE_DYNAMIC_IMPORT` warnings gone.
- **Mass-message rate limit tightened** (security 2.8): `isMassMessage` flag
  added to the Message model; socket + REST paths now cap at **5 mass
  messages/hour** (was 100 total messages/hour) and 20 recipients/send.
  Tests: `socketSecurity` +2, `quickActionsController` +2.
- **Honest encryption UI**: the chat header lock icon now reflects the
  Client-E2EE mod (shows "encrypted in transit & at rest" when off, real
  E2EE only when the mod is on).
- **Removed dead `xss-clean` dependency** (already replaced by sanitizeInput
  in security middleware).
- **Removed the last global socket broadcast**: `call_ended_signal` (nothing
  consumed it; `call:ended` to the conversation room is the real signal).
- **E2E**: `privacy-selectors.spec.js` — opens Settings → Privacy, switches
  Profile photo → Nobody and verifies persistence via `/api/settings`, and
  opens the contact selector from "My Contacts Except...".
- **E2E**: `mass-message.spec.js` — exercises the REST mass-message path
  end-to-end: happy path to 20 recipients, rejects 21, and enforces the
  5/hour rate limit.
- **E2E**: `abuse-report.spec.js` — full report → admin list → resolve flow
  (user reports, admin logs in with username + TOTP, resolves the report).
- **Unit tests**: `processHandlers` (3 — verifies `uncaughtException` /
  `unhandledRejection` handlers are registered and exit(1)) and JWT rotation
  replay-rejection + refresh-version-bump tests in `authController` (+2).
- **vite 8 chunk splitting**: `manualChunks` → rolldown `advancedChunks`
  groups; `chat-area` chunk shrank **1,253 kB → 58 kB**, leaflet split into
  its own chunk, `vendor` 455 kB — no chunk-size warnings remain.
- **CI e2e isolated test-DB**: the Playwright job now targets a dedicated
  `genz-e2e-test` database (never the real `genz-whatsapp` name) and sets both
  `MONGODB_URI` (backend) and `MONGO_URI` (specs/prep) to it so
  `e2e/global-setup.js`'s leak guard is active; the DB-backed specs
  (privacy-selectors, mass-message, abuse-report, admin-crash-panel, and
  friends) are documented in the workflow.
- **Race-safe `e2e-admin-prep.js`**: the shared AdminOwner + seeded crash are
  now atomic upserts (unique `ownerKey` / deterministic `_id`) instead of
  delete-then-create, so `admin-crash-panel` and `abuse-report` can run in
  parallel workers without duplicate-key errors, an absent-owner login window,
  or a wiped crash seed. Lockout/refresh/session state is still reset every
  run. New `adminPrepIntegration.test.js` proves it by firing two prep
  processes concurrently and asserting a single converged owner + crash; wired
  into the CI integration job.
- **Per-spec admin identities**: `e2e-admin-prep.js` accepts
  `E2E_ADMIN_USERNAME`/`PASSWORD`/`TOTP_SECRET`/`OWNER_KEY` overrides and each
  admin spec provisions its own owner (`e2e_admin_crash` vs `e2e_admin_abuse`,
  distinct ownerKeys) so a failed attempt or lockout in one spec can never
  cascade into the other. `adminAuthController.loginStep1` now resolves the
  owner **by username** (still finds the bootstrapped `PRIMARY_OWNER`) with a
  no-enumeration-leak guard: unknown username → 401 when any owner exists, 503
  only when the server has no owner at all. `adminPrepIntegration` now also
  hammers prep with **8 concurrent processes** (still exactly one owner + one
  crash) and validates both per-spec owners are reachable via loginStep1.
- **Refresh/logout resolve the owner by token**: `refreshSession` and `logout`
  no longer hard-code `PRIMARY_OWNER` — they find the owner holding the given
  refresh token (48 random bytes, constant-time per-doc verify), so per-spec
  owners get working refresh rotation and targeted logout. The admin client
  now sends its refresh token on logout. `adminAuthIntegration` covers a
  non-PRIMARY owner's full login → refresh → rotation cycle.
- **CI parallel-admin stress**: the e2e job re-runs the two admin specs with
  **8 Playwright workers** (`--repeat-each=4` → 8 concurrent file instances)
  to prove per-spec credentials and race-safe prep hold at maximum
  parallelism. `ADMIN_LOGIN_MAX` (default 10/15min, unchanged in production)
  is raised to 100 in CI so the strict admin rate limiter doesn't mask the
  test.
- **Security code review fixes**: (1) admin `loginStep1` now burns an
  equivalent scrypt cost for unknown usernames so response timing cannot
  enumerate which admin usernames exist, and trims the username consistently
  (query + constant-time compare) so a trailing space no longer counts as a
  failed attempt; (2) `e2e-admin-prep.js` refuses to run against any database
  whose name lacks `e2e`/`test` — it provisions public fixed credentials and
  would otherwise plant a backdoor admin on a real DB (integration-tested);
  (3) the prep script no longer logs the TOTP secret.
- **Admin logout hardened**: `POST /logout` now REQUIRES a valid refresh
  token — the `PRIMARY_OWNER` fallback is gone, so an unauthenticated request
  can no longer clear the owner's session (400 without a token, 401 with an
  unknown one). The admin client already sends its refresh token; integration
  test covers the full login → logout → refresh-rejected cycle.

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
- **ChatArea child components extracted** (4778 → 2613 lines): message
  bubbles → `MessageBubbleList.jsx`, composer + header →
  `MessageComposer.jsx`/`ConversationHeader.jsx`, and the scrollable message
  list + modals → `MessageListArea.jsx`/`ChatModals.jsx`, all fed by memoized
  context bundles and `React.memo`-ed for fewer re-renders on typing /
  socket updates. Scripted Babel extraction verified byte-for-byte; early-
  return paths moved below the `useMemo` bundles to keep hook order stable.
  Frontend tests green.
- **ChatArea e2e coverage expanded**: `bubble-interactions.spec.js`,
  `header-composer.spec.js`, and the ForwardDialog flow exercised from the
  bubble menu after each extraction.
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
