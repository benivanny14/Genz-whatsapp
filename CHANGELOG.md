# Changelog

All notable changes to GENZ WhatsApp are recorded here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/): dates are approximate,
grouped by theme rather than strict semver, since this project tracks releases
by commit.

---

## [2026-08-13] — iOS target, real-FCM guide + release tooling for Chrome-download distribution

**iOS build (Capacitor, Xcode required)**
- Added the `@capacitor/ios` target (`frontend/ios/`, `npx cap add ios`) with the
  same 4 native plugins (push, local notifications, filesystem, share) and the
  shared `capacitorBridge` web fallbacks. Bundle id `com.benivanny.genzwhatsapp`;
  display name "GENZ WhatsApp".
- Branded AppIcon (1024×1024 single-size) + dark `#0c0a1e` splash — regenerable
  via `frontend/scripts/generate-ios-icons.js` (mirrors the Android assets).
- Building requires macOS + Xcode (documented); no code changes needed to the
  web app.

**Push notifications for the installed apps**
- `docs/FCM_SETUP_GUIDE.md`: step-by-step Firebase wiring — Android
  `google-services.json` (auto-enables the google-services Gradle plugin when
  present), iOS `GoogleService-Info.plist` + `FirebaseApp.configure()`, backend
  service-account env vars (`FIREBASE_*`), and a verify-the-full-loop checklist.
- `google-services.json` / `GoogleService-Info.plist` added to `.gitignore` so
  Firebase keys can never be committed.

**Release tooling (Chrome download, no Play Store)**
- `frontend/scripts/bump-app-version.js` (`npm run bump:apk`): bumps Android
  versionCode (+1) + versionName **and** iOS build/version, and rewrites
  `public/version.json`.
- `build-apk.js` now writes `public/version.json` (version, versionCode, apkUrl,
  **sha256**, size) after each build; login page shows
  "GENZ WhatsApp Android vX.Y.Z" under the Download button (graceful when the
  file is absent) so users can spot stale installs.
- `docs/APK_RELEASE_CHECKLIST.md`: the direct-download release cycle — keystore
  backup/continuity, per-release build + verify + deploy, the user install flow
  in Chrome (unknown-source + Play Protect prompts), troubleshooting, and
  rollback. `MOBILE_READINESS.md` updated with the iOS target + release steps.

**Verification**
- Frontend production build ✓ · `check:jsx` ✓ · bump script tested on real
  gradle/pbxproj (then reverted) ✓ · backend suite untouched (1863 pass).

---

## [2026-08-13] — Android APK: real signed build, GENZ branding, native push + media downloads

**Installable Android app (Capacitor 8)**
- Replaced the mock APK with a **real signed release APK** (`frontend/public/genz-whatsapp.apk`,
  ~10MB) that wraps the production web app in a native WebView and talks to the live API.
  Download button (*Download Android App*) on the login page; also served at
  `https://genz-whatsapp.onrender.com/genz-whatsapp.apk`.
- Reproducible pipeline: `npm run apk:build` (web build → `cap sync android` →
  `gradlew assembleRelease` → copy to `public/`); release builds signed with
  `frontend/android/genz-release.keystore` via gitignored `keystore.properties`.
- Backend allows the Capacitor webview origins (`https://localhost`, `capacitor://localhost`)
  in the shared CORS + CSRF allowlist.

**Branding**
- Launcher icons (legacy + adaptive with teal `#04785C` glass-bubble glyph) and splash
  screens (portrait/landscape + Android 12+ system splash, dark `#0c0a1e` with the GENZ
  icon) — regenerable via `frontend/scripts/generate-android-icons.js`.

**Native behaviour in the WebView** (`frontend/src/services/capacitorBridge.js`, web-safe fallbacks)
- `@capacitor/push-notifications`: registers an FCM token with the existing
  `/api/notifications/fcm/register` endpoint; pushes feed the same in-app toasts;
  degrades gracefully without a Firebase project.
- `@capacitor/local-notifications`: system notifications for messages/calls inside the
  WebView (web Notification API unavailable there) + white status-bar icon.
- `@capacitor/filesystem` + `@capacitor/share`: downloads (documents, voice notes, QR
  codes, chat exports) save to the device and open the share sheet; browsers keep the
  classic anchor download.
- React Native prototype also fixed to install and bundle (`react-native` deps corrected,
  metro.config.js, .gitignore; clean 1.7MB Android JS bundle).

**Docs / verification**
- `docs/MOBILE_READINESS.md` documents the APK build, signing/key backups, native plugin
  wiring, and the live phone preview (`frontend/phone-preview.html`).
- Full mobile sweep green: 27/27 e2e specs (incl. `mobile-layout.spec.js` on iPhone 13 +
  Pixel 7 across all 130 feature panels), `npm run check:jsx` import scan wired into CI.

---

## [2026-08-12] — Post-audit hardening: targeted block emits, atomic reactions, CSAM urgency, Redis-ready sockets, swagger

**Security / correctness fixes (SEHEMU A + B)**
- `blockUser`/`unblockUser` now emit `user:blocked`/`user:unblocked` ONLY to the
  blocker + target sockets — previously a global `io.emit` reached every user.
- `addReaction` is fully atomic: `findOneAndUpdate` with `{ new: true }` for
  both the add (`$ne` guard) and the update (`$set`) paths — no
  read-modify-write race when two users react at the same time. Removed the
  dead non-atomic duplicate.
- CSAM / child-abuse reports (`csam`, `child_abuse`, `child exploitation`) are
  now `priority: urgent` in both `reportMessage` and `reportUser`. Also fixed
  the AbuseReport model enum which REJECTED `csam`/`child_abuse` — every CSAM
  report previously failed with a validation error and was silently lost.
- Removed `xss-clean` dependency (unmaintained; already unused — see
  middleware/security.js SECURITY 3.9).
- `onlineHistory` pruning now keys on `expiresAt` (with a `connectedAt` fallback
  only for legacy entries that have no `expiresAt`) — sessions with a future
  `expiresAt` are no longer wrongly pruned.

**Architecture (SEHEMU C)**
- Socket rate limit + `onlineUsers` presence are Redis-backed when Redis is
  configured (survive reconnects / horizontal scaling) with full in-memory
  fallback in single-instance mode.
- Media storage already routes to Cloudinary in production (verified — local
  disk is dev-only fallback).
- Added `backend/scripts/db-backup.js` — automated `mongodump` with retention
  + optional S3/GCS upload, wired for cron.
- Added Swagger UI at `/api-docs` (OpenAPI 3.0 spec in `backend/swagger/`).

**Verification**
- Backend: 1854/1854 tests (exit 0) · check:exports ✓ · Frontend: 80/80 + build ✓
- Feature verification: 186/186 · Presence e2e: 12/12
- Live API checks: two users reacting concurrently both persist; CSAM report
  saved with `priority: urgent`; block/unblock emit to the right sockets only.
- `npm audit --omit=dev`: **0 vulnerabilities** (16 moderate are dev-only
  artillery→OpenTelemetry transitive deps; no non-breaking fix available).

---

## [2026-08-12] — Full-feature verification, anti-screenshot wiring, settings validation, CI coverage

**Feature verification harness**
- `backend/scripts/feature-full-verification.js` — 186 live-API checks across
  status (54), chat (34), group member/admin roles (34), settings (15) and the
  admin system with 2FA login + content moderation (45).
- `feature-smoke-test.js` fixed (11-char test password vs 12-char policy) and
  now green at 137/137.
- Both scripts run in CI (`ci.yml` e2e job) and in the nightly
  `privacy-regression` workflow via `scripts/privacy-regression.sh --e2e`.

**Bugs found by verification & fixed**
- Status media upload failed with ENOENT because `uploads/status/` was never
  created — `routes/status.js` now ensures it exists.
- `GET /api/chat/messages/:id/edit-history` always 404'd: the projection
  dropped `conversationId` so the participant check looked up `undefined`.
- Anti-screenshot was a dead feature: `allowScreenshot` was never persisted.
  `sendMessage` (HTTP) and the `message:send` socket handler now persist it;
  the real composer gains a screenshot-protection toggle for view-once messages
  (frontend: ChatArea + MessageComposer; default ON for view-once).

**Settings validation unified (SECURITY 3.4)**
- `/api/settings` now rejects invalid enum values with 400, matching
  `authController.updateSettings` instead of silently coercing to defaults;
  `tests/settingsAudit.test.js` updated to assert the 400.

**CI tooling**
- `ADMIN_STRICT_MAX` env override for the strict admin rate limiter (default
  stays 10/hour; CI raises it only on throwaway runners — same pattern as
  `ADMIN_LOGIN_MAX`).

---

## [2026-08-12] — Controllers refactor, privacy system hardening + realtime enforcement

**Scope:** this worktree session — controller consolidation (REFACTOR_PLAN step 6),
privacy permission engine fixes, realtime socket enforcement, call/group privacy,
coverage + e2e tests, and a privacy regression harness. MongoDB models /
`config/db.js` / `MONGODB_URI` untouched.

### Changed (refactor)
- **MODs controllers consolidated 8 → 4** (`messageProtectionController`,
  `automationToolsController`, `statusToolsController`, `storageToolsController`)
  using the shared `userScopedService` (`createToggleHandler` / `createSettingsHandlers`)
  pattern. Route paths and API contracts unchanged — old controllers deleted,
  routes + unit tests re-pointed.

### Fixed (privacy — security)
- **"My Contacts" / `contacts_except` silently allowed everyone in production:**
  (a) `isContact()` compared `c.toString()` on `{ user, savedName }` subdocs
  (always `[object Object]`); (b) `applyPermissionInheritance` read snake_case
  keys (`last_seen`) while settings are stored camelCase (`lastSeen`), so
  inheritance never fired; (c) endpoints populated other users with limited
  fields, so the engine saw empty `privacySettings` and defaulted to **allow** —
  leaking `profilePicture`/`lastSeen`/`about` (all call sites now select
  `settings contacts`).
- **Realtime leaks closed:** presence broadcasts treated `contacts_except` as
  `contacts` (excluded contacts saw online/offline) and `user:join` never
  matched subdoc contacts; `status:create` pushed statuses to excluded viewers;
  `status:view` recorded views from excluded viewers; `user:offline` was never
  broadcast (presence cleanup ran after the still-online check).
- **Call privacy now enforced:** `silencedUnknownCallers` (socket call-offer
  paths suppress ring + push for non-contacts) and `protectIpAddressInCalls`
  (`/api/webrtc/config` returns relay-only ICE per user; frontend drops the
  cached config on toggle) were previously settings defaults with no
  enforcement.
- **Group privacy:** `privacy.groups` `contacts_except` exclusions now enforced
  on `createGroup`/`addParticipant`/`approveJoinRequest`; spoofed
  `participant:added` relays and non-member `group_call:start` rejected;
  unanswered/silenced calls now log as **`missed`** (visible in call history).

### Added
- **Shared privacy engine** `backend/services/privacyEngineService.js` — single
  source of truth (`isContact`/`isAllowed`/`canSeePresence`/`canViewStatus`/
  `isSilencedCaller`) used by the permission engine, middleware, and sockets.
- **Privacy UX:** contact selector now uses the real `/chat/contacts` API with
  alphabetical sorting + windowed virtualization (10k+ contacts stay fast) and
  live refresh via `contacts:updated`; `ContactManager` refreshes on mount/socket.
- **Tests:** backend **1828 passing / 4 skipped** (coverage up: callTools 54→92%,
  chatList 59→89%, advanced 58→76%); frontend **76/76** + production build;
  new e2e: `privacy-contact-selector.spec.js` (Playwright, single-origin :5000)
  and `scripts/e2e-presence-privacy.js` (real socket clients, 12/12).
- **Tooling:** `npm run privacy:regression[:e2e]` harness
  (`scripts/privacy-regression.sh`); nightly full-stack job
  (`.github/workflows/privacy-nightly.yml`, 02:30 UTC); e2e CI comment + presence
  script wired into `.github/workflows/ci.yml`.

### Deployment notes
- **Backend restart required** to pick up socket/controller changes (no watch in
  production). No schema/migration changes — MongoDB untouched.
- Verification before/after deploy: `npm run check`, `npm run check:exports`,
  `npm test` (backend), `npm run privacy:regression:e2e` with servers up.
- New env-independent defaults: `protectIpAddressInCalls` and
  `silencedUnknownCallers` are per-user settings — no new production secrets.

---

## [2026-08-12] — E2EE badge fix, Dashboard JSON + Render restore guide

**Commits:** `7f719be` (fix + docs), `ee3281f` (CI) — cherry-picked from the
Freebuff worktree onto `main`; CI run #244 all green (22/22 e2e).

### Fixed
- **E2EE key fingerprint badge never rendered under decrypted messages.** Root
  cause: upstream `decryptMessagesList` (ChatContext) replaced the envelope
  with plaintext before ChatArea's badge loop ever saw it, so `e2eeMeta` was
  never populated and the badge (fingerprint + NEW KEY / verified state)
  never drew — even though decryption itself worked. Fix:
  `e2eeMessage.js` now attaches the verified state during upstream
  decryption and `ChatArea.jsx` renders the badge from the server stamp.
  Verified live in the preview (badge `D02A6119` renders) and covered by the
  updated `e2ee-fingerprint.spec.js`.
- **Admin Dashboard (System Control) showed `[object Object]`** for the
  `services` and `runtime` health fields (nested objects stringified with
  `String(v)`). `AdminDashboard.jsx` now renders them as readable JSON.

### Changed
- **`header-composer.spec.js`**: the conversation-header badge now expects
  "Messages encrypted in transit and at rest" by default, matching the
  documented Client-E2EE mod default (OFF → transit/at-rest label; the
  "Chat encrypted end-to-end" badge shows only when the mod is on). The
  previous unconditional expectation was a spec bug, not a product one.

### Docs
- **`RENDER_DEPLOY_GUIDE.md` rewritten**: removed references to the deleted
  `setup-render-env.js` / `export-render-env.js` scripts (the guide was
  stale), replaced the script step with a manual Render Dashboard env
  workflow, and updated the troubleshooting table.
- **`RENDER_RESTORE_CHECKLIST.md` added**: step-by-step checklist to restore
  the downed Render service — full production env key table, secret
  generation, the fail-closed startup requirements (`MONGODB_URI` not
  localhost, `JWT_REFRESH_SECRET` ≠ `JWT_SECRET`, `ALLOW_MOCK_PAYMENTS`
  false, HTTPS URLs, Cloudinary required), deploy + verification steps, and
  troubleshooting.

### CI
- **`workflow_dispatch` added** to `.github/workflows/ci.yml` so the full
  pipeline (incl. e2e) can be triggered manually from the Actions tab.
- **`npx playwright install` now runs inside `frontend/`** (was executed from
  the repo root where no Playwright config lives).

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
