# Changelog

All notable changes to GENZ WhatsApp are recorded here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/): dates are approximate,
grouped by theme rather than strict semver, since this project tracks releases
by commit.

---

## [2026-08-14] — v1.1.14: frontend proxy fix + Render diagnostics

**Web app API proxy fixed (production incident)** — `genz-whatsapp-1` serves the
SPA with `vite preview`, and its `/api` proxy defaults to
`http://localhost:5000` (there is no backend inside the frontend container), so
every API call failed with `ECONNREFUSED` (502) and the web app could not log in
or sync. The service now has `GENZ_BACKEND_TARGET=https://genz-whatsapp.onrender.com`
set (vite preview reads it at startup) and was redeployed from `main`.
Verified from an independent network: `genz-whatsapp-1.onrender.com/api/health`
→ 200 (proxied to the backend), SPA `/` → 200, `/version.json` → 200 (v1.1.14,
code 16). The **APK is unaffected** — `scripts/build-apk.js` bakes
`VITE_API_URL=https://genz-whatsapp.onrender.com/api` at build time, so the app
in the bundled APK talks to the backend directly.

- `scripts/render-deploy-status.js` overhauled: lists every service in the
  workspace, real deploy statuses/commits (the API is cursor-wrapped
  `{deploy, cursor}` — previously every field printed `?`), service events
  (deploy_started/build/deploy_ended with status), and the runtime log tail via
  `/v1/logs` (needs `ownerId` + the raw service id as `resource`).
- New `scripts/render-fix-proxy.js` + `workflow render-fix.yml`: point a frontend
  service's proxy at the backend and redeploy it. Uses the **per-key**
  env-var endpoint `PUT /v1/services/{id}/env-vars/{key}` with `{value}` — the
  bulk `PUT /v1/services/{id}/env-vars` *replaces ALL* env vars and must never
  be used for a single var (it would wipe secrets).
- `render-status` workflow now also curls `/api/health`, `/version.json` and `/`
  on all three onrender hosts from GitHub Actions for authoritative checks.

## [2026-08-14] — v1.1.14: security hardening (post-audit)

**Per-IP rate limiting fixed in production** — `TRUST_PROXY=1` was configured
but `server.js` only accepted `=== 'true'`, so Express trust-proxy was
silently DISABLED: every request behind the Render proxy resolved to the same
`req.ip`, making every IP-keyed rate limiter (auth 100/15min, API 2000/15min,
admin 20/15min, login 10/15min) share ONE budget across ALL users — a few
sign-ups or API calls would throttle the whole app. The flag now parses
`'1'/'true'/'yes'/'on'`; with it enabled `req.ip` resolves the real client IP
(Express reads X-Forwarded-For, which Render overwrites) and per-IP limits
work per user again.

- `superAdminAuth.clientIp()` now prefers `req.ip` — a client-supplied
  `X-Forwarded-For` header can no longer spoof the admin IP allowlist on a
  directly-exposed server.
- Removed the dead unauthenticated `POST /auth/bootstrap` route (it could
  never succeed — `bootstrapAdmin` needs `req.user` from `protect`, so it
  500'd — and only widened the admin attack surface). Admin bootstrap remains
  on `adminRoutes.js` behind `protect` + `strictRateLimiter`.
- New Swahili guide `docs/FCM_SETUP_KISWAHILI.md`: step-by-step Firebase
  console walkthrough to obtain `google-services.json` and enable FCM push.

---

## [2026-08-14] — v1.1.14: calls removed (pure messaging) + true offline APK

**GENZ is now a pure messaging app — all voice/video/group call features were
removed completely (frontend, backend, sockets, permissions, service worker,
CSS, docs).** Messaging (text, photos, videos, files, voice notes, status),
auth, contacts, push notifications for messages and offline mode are
unchanged and verified.

**Offline APK**
- `capacitor.config.json` `server.url` removed — the APK now BUNDLES the built
  web app (`dist/` → `assets/public/` inside the APK) instead of loading the
  site from Render. The app opens instantly and works fully offline; API calls
  still reach the live backend over the network when it is available.
- Version rows, the update banner and the APK download link now fall back to
  the production origin inside the bundled APK (`src/utils/versionManifest.js`)
  so updates stay discoverable. Splash config: `launchAutoHide`, `CENTER_CROP`,
  `#128C7E` icon color.
- Pre-build check extended (8 checks): every manifest icon must exist,
  `public/screenshots/` needs ≥ 2 images, `capacitor.config.json` must NOT have
  `server.url` (fails otherwise), and `vite.config.js` must register `VitePWA`.
- Maskable PWA icons generated with safe-zone padding
  (`scripts/generate-maskable-icons.js`, 60% scale on #075E54) and wired into
  `manifest.json` as separate `purpose: "maskable"` entries.

**Calls removed — frontend**
- Deleted: `CallScreen`, `GroupCallScreen`, `CallFeaturesPanel`, admin
  `CallsManagement`, `pages/Calls`, `services/callService`, `services/webrtc`,
  `config/webrtc`, `utils/callUi` (+ its tests).
- `App.jsx`: no call screens, no call URL/SW-message handling, no call state;
  `useNativeBackButton` lost its `isCallActive` skip.
- `ChatContext`: `activeCall`/`activeGroupCall`/`callLogs` state, all call
  socket listeners (`call:incoming`, `call:accepted`, `call:rejected`,
  `call:ended`, `call:log:created`, `webrtc:offer`, `group_call:incoming`) and
  the call actions (`initiateCall`, `acceptCall`, `rejectCall`, `endCall`,
  `fetchCallLogs`) removed.
- Chat header/composer/bubbles had no call buttons (verified); Settings Calls
  tab, Status "Call Features" panel, admin Calls panel, Sidebar calls tab,
  FakeChat fake-calls, notification call sounds/vibrations, and call CSS
  classes removed. `simple-peer` + TURN env vars gone from both package.json
  files and lockfile.

**Calls removed — backend**
- Deleted: `callController`, `callToolsController`, `webrtcController`,
  `adminCallsController`, `CallLog` model, `callRoutes`, `webrtcRoutes`,
  `call-blocker`, `call-features`, `callHandlers` socket module, `activeCalls`,
  `config/webrtc`, `call-signaling-test` + 5 call test suites.
- `/webrtc`, `/calls`, `/call-blocker`, `/call-features` route mounts removed;
  `call:start/accept/reject/end`, `webrtc:offer`, `incoming_call` push, and the
  disconnect call-cleanup removed from sockets; `sendIncomingCallNotification`
  and `isSilencedCaller` deleted; TURN validation removed from `validateEnv`;
  fake-chat fake calls and group voice/video/screen-share toggles removed.

**Android**
- `MODIFY_AUDIO_SETTINGS`, `FOREGROUND_SERVICE_CAMERA` and
  `FOREGROUND_SERVICE_MICROPHONE` permissions removed from the manifest.
  `CAMERA` + `RECORD_AUDIO` stay — photos/video messages and voice notes need
  them.

**Service worker**
- Incoming-call push handling, Answer/Decline actions, and the
  `INCOMING_CALL`/`CALL_DECLINE` click handlers removed; message notifications
  and offline app-shell caching unchanged.

**Verification**
- Backend 1741/1741 tests · frontend 95/95 · check:jsx ✓ · production build ✓
- APK v1.1.14 (code 16) rebuilt with the bundled app (`assets/public/`
  contains index.html + the full dist) and verified on the Android emulator.

---

## [2026-08-14] — v1.1.13: production APK pipeline fixes (v1.1.12 superseded)

**v1.1.12 was broken for APK users and superseded by v1.1.13 (versionCode 15).**
Three production issues found during live verification were fixed and deployed:

**1. APK download served HTML instead of the APK**
- `public/genz-whatsapp.apk` was gitignored ("the site itself serves
  /genz-whatsapp.apk"), so CI builds — which run from the git checkout — never
  included it and production served the SPA fallback (`index.html`) for
  `/genz-whatsapp.apk`, while `version.json` claimed a valid sha256.
- **Fix**: the APK is deliberately tracked again and committed with every
  release (as `docs/APK_RELEASE_CHECKLIST.md` always said). The gitignore
  comment that caused the confusion was replaced with an explanation.

**2. APK WebView showed "Cannot GET /"**
- `capacitor.config.json` `server.url` pointed at `genz-whatsapp.onrender.com`
  — the API-only host, which serves no frontend. The WebView loaded it and
  rendered Express's 404 (`Cannot GET /`), making the app unusable.
- **Fix**: point `server.url` at the UI host `genz-whatsapp-1.onrender.com` so
  the APK loads the same site as the web app, with `/version.json` and
  `/genz-whatsapp.apk` served same-origin for the update banner. Verified on
  an Android 14 emulator via Chrome DevTools: the WebView loads
  `/login` and shows "GENZ WhatsApp Android v1.1.13".

**3. False "Update available" toast on first-time install**
- The service worker calls `skipWaiting()` + `clients.claim()`, so a fresh
  install fires `controllerchange` and `main.jsx` showed the "Update
  available / Reload Now" toast even though the user just installed the
  latest version.
- **Fix**: only dispatch `pwa-update-available` when the page was already
  controlled by a previous service worker (a genuine update).

**Also in this line of work (v1.1.12 → v1.1.13)**
- Native Android back button (close chat → history → minimize; skipped in calls).
- Pre-build checks in `apk:build` (icons, manifest, keystore, version sync).
- WhatsApp-green launcher icon + splash across Android/iOS/PWA (SVG gradient
  switched from teal/violet to #075E54 → #128C7E → #25D366).
- FCM auto-detection: adding `frontend/android/app/google-services.json` alone
  enables native push on the next build (no code change).
- Fixed `cleanup-dev.js` overwriting `public/manifest.json` (it stripped
  maskable icons + screenshots on every dev-server start).

**Deployment pipeline**
- `.github/workflows/deploy.yml` deploys to Render on every push to `main`
  (quality gates: backend jest + frontend build, then Render deploy action).
- PRs #20–#23 merged; production verified serving v1.1.13 with the APK
  sha256 (`e336da12…`) matching `version.json` and the committed APK.

---

## [2026-08-14] — v1.1.11: real native fingerprint lock in the APK

**Native biometric authentication (@capgo/capacitor-native-biometric)**
- New `capacitorBridge` helpers (`isBiometricAvailable`, `authenticateWithBiometric`)
  that show the real Android/iOS biometric prompt (BiometricPrompt /
  LocalAuthentication) inside the APK; web falls back gracefully.
- **App Lock** (Settings → App Lock) now offers a lock method: **PIN** or
  **Fingerprint**. Fingerprint unlocks via the native OS prompt in the APK and
  falls back to the backup PIN on the web (or when the scan fails). The lock
  screen shows the fingerprint icon and auto-prompts on appear.
- `BiometricLock`, `BiometricAuthPrompt`, `ChatLock` fingerprint unlock, and
  the `AppLock` demo component now call the real device biometric in the APK
  instead of the old simulated scan.
- Payments, view-once, anti-screenshot, and every other feature are unchanged
  (manual mobile-money payment flow untouched).

**Bugs found by real emulator testing & fixed**
- **FCM crash on login**: the APK crashed every login with
  `IllegalStateException: Default FirebaseApp is not initialized` because
  `PushNotifications.register()` ran without `google-services.json`. New
  `__GENZ_FCM_ENABLED__` flag (vite.config) + guard in `capacitorBridge`
  skip FCM registration when Firebase isn't configured — no crash, push
  arrives once `frontend/android/app/google-services.json` exists.
- **App Lock wiped on logout**: `clearAllUserData()` purged localStorage
  without keeping the lock keys — lock settings now survive relaunches.
- **Cleartext/mixed-content in debug builds only**: `src/debug/AndroidManifest.xml`
  + mixed-content mode for local testing; release stays HTTPS-only.
- Release APK v1.1.11 (versionCode 13) built, signed, installed and verified
  on an Android 14 emulator (install, launch, login, lock screen, PIN
  unlock, native BiometricPrompt shown).

**GitHub download channel removed entirely**
- `downloadUrl` dropped from `version.json` and its writers (`build-apk.js`,
  `bump-app-version.js`, `lib/version-json.js`).
- Login page, Install Guide and UpdateBanner no longer link to GitHub — the
  APK is served only by the app host itself (`/genz-whatsapp.apk`, same-origin).
- Deleted `scripts/create-github-release.js`, `scripts/release-engagement-check.js`,
  `.github/workflows/release.yml` and the `npm run release:github` script;
  engagement steps removed from the nightly health workflow.

**Docs**
- New `docs/MWONGOZO_APK_NA_DEPLOY.md` (Swahili): keystore creation, APK
  build, site-only distribution, Render diagnosis + env checklist, FCM quick steps.
- New `docs/KUSAKINISHA_APK_SIMU.md` (Swahili): installing the APK on a real
  Android phone (file transfer + USB/ADB).
- New `docs/QA_APK_111_EMULATOR.md`: full emulator QA report for v1.1.11.

---

## [2026-08-13] — v1.1.10: email alerts, update history, admin screenshots, nightly-verify

**Email alerts (backend + nightly)**
- New `alertMailerService` (nodemailer, SMTP via env vars already defined in
  render.yaml) plus a public `POST /api/telemetry/notify` endpoint used by the
  nightly workflow to send best-effort email alerts on failures. Secret-less
  environments skip mail gracefully.

**Update history in Settings**
- Privacy → Update Analytics section now shows the history of the current
  device (shown / dismissed / updated events per version), mirroring the
  banner state.

**Admin panel screenshots (e2e)**
- New `e2e/admin-panels.spec.js` seeds app events and captures 5 screenshots
  of the admin dashboard (Update Analytics, Release Adoption, Nightly Health
  Check panels) for visual QA.

**Nightly verify workflow**
- New `nightly-verify.yml` re-checks the 03:15 UTC nightly run and confirms
  self-healing (stale alert issues closed) so a passing nightly is verified
  end-to-end without manual dispatch.

**Hotfix — CI/deploy failure (nodemailer undeclared)**
- `alertMailerService` required `nodemailer` at module load but the package
  was never added to `backend/package.json`. Local tests passed only because
  the parent repo's `node_modules` happened to contain it; CI's `npm ci`
  installs strictly from the lockfile, so the backend crashed on boot
  ("Cannot find module 'nodemailer'") and the backend-tests, e2e and deploy
  jobs all failed on `main`. Fixed by declaring `nodemailer@^9.0.5` in
  dependencies + lockfile (backend tests 1880/1880, check + check:exports
  green).

---

## [2026-08-13] — v1.1.9: uptake on install page, auto-refresh + adoption trend, low-engagement alert

**Release uptake on the install guide**
- The uptake line is now a shared `ReleaseUptake` component (login page + `/install`):
  `📊 v1.1.9: N updated · M shown — masaa 48 ya mwisho (last 48h)`, shown only
  once data exists.

**Admin dashboard: auto-refresh + release adoption trend**
- The Update Analytics and Nightly Health Check panels now auto-refresh every
  60s (no manual Refresh clicks needed).
- New **Release Adoption** panel: per-version table (last 30 days) with
  shown / updated / **adoption %** (updated÷shown) and a 7-day updated
  trend column — spot which releases users actually moved to. Backed by a
  new 7-day aggregate (`byVersion7`) in `/api/admin/app-events`.

**Low-engagement release warning (nightly)**
- `scripts/release-engagement-check.js` (public GitHub releases API + uptake):
  flags a release live **>7 days** whose banner was seen by <5 opt-in devices
  while the PREVIOUS release had data — users may not be opening the app.
  The previous-release guard prevents false alarms while the opt-in toggle
  is still being adopted. Files a dedicated 👀 issue when triggered.
- Unit tests for the decision logic (5 release-script tests now) + syntax
  check for the new script.

## [2026-08-13] — v1.1.8: nightly self-healing, nightly status in admin, bilingual footer

**Nightly health check now closes its own stale alerts**
- When the whole check PASSES, the workflow closes any open
  "Production health check failed" issues (the #10/#17 false positives or
  any outage that recovered). Stuck-release issues (📉) are never touched.
  The fix + all nightly steps were re-verified end-to-end against production.

**Nightly status in the admin dashboard**
- New `GET /api/admin/nightly-status` (admin-protected proxy of GitHub's
  public Actions API — works without a token since the repo is public) and
  a **Nightly Health Check** panel in the admin Overview: last 5 runs with
  ✅/❌/⏳, timestamps, and links to the Actions run.

**Bilingual uptake footer**
- Login page uptake line now reads `📊 vX: N updated · M shown — masaa 48
  ya mwisho (last 48h)` (Kiswahili + English, matching the install page).

**QA checklist extended**
- `docs/QA_UPDATE_BANNER_CHECKLIST.md` gains a section covering the opt-in
  toggle, login uptake footer, admin analytics panel, and nightly panel.

## [2026-08-13] — v1.1.7: uptake footer, explain-before-opt-in, analytics docs, nightly fix

**Release uptake on the login page**
- Under the version line, a muted footer shows aggregate uptake for the
  current release when data exists: `📊 v1.1.7: 2 updated · 5 shown (last 48h)`
  (from the public `/api/telemetry/events/uptake`; shown only when `shown > 0`).

**Explain-before-opt-in (Privacy)**
- The Update Analytics section now shows a notice (in Kiswahili) explaining
  exactly what is collected — 4 fields, random device id, no phone/name/
  messages, deleted after 180 days — before the toggle is switched on.

**Analytics documentation**
- New `docs/UPDATE_ANALYTICS.md`: the event model, endpoints, opt-in flow,
  admin panel, stuck-release alert, and how to query the data.

**Nightly health check fixed (false positives)**
- The nightly's render-deploy-verify step checked `/api/health` on the UI
  host (`genz-whatsapp-1`), which sleeps on the free tier and returns
  502/000 while cold — filing false alert issues (#10, #17) every night.
  It now checks the real API host (`genz-whatsapp.onrender.com`, where
  MongoDB lives and which stays warm) with longer retries. The nightly's
  new uptake + stuck-release steps were exercised end-to-end against
  production and pass.

## [2026-08-13] — v1.1.6: analytics opt-in + admin panel, stuck-release alert, CI smoke tests

**Update analytics are now opt-in (Privacy)**
- New **Update Analytics** section in Settings → Privacy (next to Crash
  Reporting): an `Update analytics` toggle that must be on before any
  anonymous update events are sent — same opt-in pattern as crash reporting.
  Nothing is collected by default.

**Admin dashboard: Update Analytics panel**
- The admin Overview now shows an **Update Analytics (server)** panel next to
  the crash panels: total shown / dismissed / updated in the last 30 days,
  plus a per-version table (vX: shown · dismissed · updated). Data comes from
  `GET /api/admin/app-events`.

**Nightly stuck-release alert**
- New public `GET /api/telemetry/events/uptake?version=X&sinceHours=48`
  (returns only four integers — shown/dismissed/updated, no PII) and a new
  nightly step: if the current release was shown to ≥ 3 devices but nobody
  updated within 48h, the workflow files a dedicated
  **"Users may be stuck on an old version"** issue with the uptake numbers
  and likely causes (asset download, keystore, Play Protect).

**Release-script smoke tests in CI**
- `ci.yml` frontend job gets an explicit **Release-script smoke tests** step
  (`node --test src/tests/releaseScripts.test.js`) alongside the unit-test
  glob that already covers them.

## [2026-08-13] — v1.1.5: update analytics, installed-vs-latest in Settings, e2e + release-script tests

**Anonymous update analytics (how many users actually update)**
- New `POST /api/telemetry/events` (public, rate-limited, allowlisted event
  names only) + `AppEvent` model (TTL 180 days) + admin `GET /api/admin/app-events`
  aggregate: events per name, and per version (shown / dismissed / updated).
- `frontend/src/utils/updateAnalytics.js`: fire-and-forget beacon with a
  per-device random id (no PII), `update_shown` deduped per version so the
  metric is devices, not page loads. Wired into the banner: shown, dismissed,
  Update tap, Reload tap.

**Installed vs latest in Settings**
- The Help → "Android app version" row now compares what the device/bundle
  is RUNNING against the latest release: `v1.1.4 → v1.1.5 [Update]` when
  stale, plain `v1.1.5` when up to date (native versionCode on the APK,
  baked-in bundle version on the web).

**E2E coverage for the web update banner**
- `e2e/update-banner.spec.js` (3 tests): stale bundle shows the banner with
  Reload and no APK buttons; dismiss persists across reload; up-to-date
  bundle shows nothing; pre-dismissed versions stay hidden. Intercepts
  /version.json, so no deploy or backend is needed.

**Release-script smoke tests (regression guard)**
- `src/tests/releaseScripts.test.js` runs the REAL `bump-app-version.js` on
  throwaway copies (the existsSync crash from v1.1.4 would have been caught),
  unit-tests the extracted `scripts/lib/version-json.js` writer (sha/size
  correctness), and syntax-checks the build scripts.

## [2026-08-13] — v1.1.4: update banner on web, SW regression tests, honest embedded version.json

**Update banner now works on the web too (not just the APK)**
- The bundle version (versionCode from `public/version.json`) is baked in at
  build time (`__GENZ_VERSION_CODE__` in vite.config). On the web, a stale
  cached bundle — a tab or PWA that never reloaded since a deploy — compares
  the served `/version.json` against its own build version and shows the
  update banner with a **Reload** button. Up-to-date bundles show nothing.
- **Dismiss bug fixed**: the banner stored the version *string* but compared
  against the numeric versionCode, so dismiss never actually worked — the
  banner came back on every visit. It now stores/compares the versionCode
  consistently on both platforms.

**Service worker regression tests**
- New `src/tests/serviceWorker.test.js` (6 tests): the SW fetch handler is
  driven in a vm sandbox and verified to never intercept `/version.json`, the
  APK, `/api/*` or non-GET requests, while still handling navigation and
  hashed assets. Guards the v1.1.3 cache-fix against regressions.

**Honest embedded version.json in the APK**
- `bump-app-version.js` no longer carries the previous release's sha256/size
  into the new `version.json` — the copy bundled inside the APK used to claim
  the OLD release's checksum. It now writes `null` (clearly a placeholder)
  and `apk:build` fills the real values only in the served file.

**Manual QA checklist for real devices**
- New `docs/QA_UPDATE_BANNER_CHECKLIST.md`: step-by-step verification of the
  update banner, sideloading, checksum, dismiss, web reload flow, offline and
  edge cases on a real Android phone.

## [2026-08-13] — v1.1.3: fresh version checks, SW cache fix, deploy-lag alerts

**Service worker no longer caches /version.json or the APK (bug fix)**
- The cache-first SW handler was swallowing `/version.json` — it only refetched
  on cache miss, so the login version line and the in-app update banner kept
  showing the version from the user's first visit forever. A new release was
  invisible until the cache was manually cleared. Worse, a stale cached copy
  of the APK could be handed to a user clicking Download, installing an old
  build over a new one. Both requests now bypass the SW entirely (SW v5,
  cache renamed to force a clean slate).
- `server.js` now sends `Cache-Control: no-store` for `/version.json` and
  `/genz-whatsapp.apk`, so the update banner always sees fresh data even when
  the express static cache would have kept a day-old copy.

**Nightly alert issue now reports deploy lag**
- When live ≠ repo version, the alert issue includes a version comparison
  table (repo vs live) plus links to the deploy workflow, Render status
  workflow, and latest releases — instead of a one-line warning.

## [2026-08-13] — v1.1.2: smart download fallback, nightly deploy-health alerts, GitHub-first updates

**Smart download fallback (login page)**
- The primary *Download Android App* button now probes the same-origin APK
  (HEAD, 8s timeout); if the free-tier instance stalls it, the button silently
  points at the GitHub release (`downloadUrl` from version.json) instead —
  title changes to explain why.

**GitHub-first in-app updates (APK)**
- `UpdateBanner` now prefers `downloadUrl` (GitHub release asset, reliable)
  for its Update button, with a secondary "Site" button when the mirror
  differs from the local file.

**Nightly deploy-health alerts (task: Render status learnings)**
- `prod-health-nightly.yml` extended: verifies `/version.json` on the UI host
  against the repo's version (warns on deploy lag), range-checks the APK
  download, checks the API host's `/api/health`, and always prints the latest
  Render deploy status (`render-deploy-status.js`) — any failure files an
  alert issue as before.
- `render-status.yml` remains available as a manual workflow_dispatch from the
  Actions tab (direct API dispatch was rejected by this environment's token).

**v1.1.2 release**
- Bumped (versionCode 4), rebuilt (5.8 MB, signed, no self-embedding), pushed
  through the full pipeline: bump → build → push main → deploy → tag →
  auto-release.

**Verification**
- 81/81 unit tests · check:jsx ✓ · build ✓.

---

## [2026-08-13] — v1.1.1: GitHub download mirror, Render status tooling, full pipeline verified

**Reliable APK download (free-tier fix)**
- `version.json` now carries a `downloadUrl` — the permanent GitHub release
  asset — and the login page shows a "Pakua kutoka GitHub" link under the
  Download button; the install page gains a second "Download from GitHub"
  button (`releases/latest/download/...`). Same-origin APK stays primary, but
  users can switch when the sleeping free-tier instance stalls the 6MB file.

**Production topology documented (investigation result)**
- Verified live: UI is served from `genz-whatsapp-1.onrender.com` while the
  API + MongoDB live on `genz-whatsapp.onrender.com` (the host baked into the
  deployed web app and the APK) — web and APK users share one database, so
  the APK API default is intentionally unchanged. Merging the two services is
  a Render dashboard task; the docs + checklist explain why not to "fix" it
  from the repo side.

**Render status tooling**
- `scripts/render-deploy-status.js`: queries the Render API for the service's
  deploy history + instance state (RENDER_API_KEY/RENDER_SERVICE_ID).
- `.github/workflows/render-status.yml` (workflow_dispatch): runs the same
  script with the repo's secrets from the Actions tab.

**v1.1.1 release**
- Bumped (versionCode 3), rebuilt (5.8 MB, signed, no self-embedding, API
  baked = genz-whatsapp.onrender.com), tagged `v1.1.1` — the full pipeline
  (bump → build → push main → tag → auto-release → deploy) runs end-to-end.

**Verification**
- 81/81 unit tests · check:jsx ✓ · release asset sha256 vs version.json ✓.

---

## [2026-08-13] — v1.1.0 shipped: production alignment, auto-release on tag, version in Settings

**Production investigation (task)**
- `genz-whatsapp.onrender.com` was the healthy backend (uptime, mongo
  connected) but was **not serving the frontend** — `/version.json` and
  `/genz-whatsapp.apk` returned Express 404s. `genz-whatsapp-1.onrender.com`
  was unreachable (stopped).
- `render.yaml` pointed `FRONTEND_URL`/`PUBLIC_API_URL` at the dead
  `genz-whatsapp-1` host while `build-apk.js` defaults, the APK and the docs
  all use `genz-whatsapp.onrender.com` — aligned to the canonical host.
  A fresh deploy (backend serves the built dist) fixes both symptoms.

**Auto-release on tag**
- `.github/workflows/release.yml`: pushing a `v*` tag now publishes the
  GitHub release with the signed APK automatically (reads version.json +
  CHANGELOG via `scripts/create-github-release.js`, `permissions:
  contents: write`). Checklist documents the tag step.

**Version in Settings**
- Help tab gains an "Android app version" row (from `/version.json`) that
  opens the `/install` guide — users inside the app can spot stale installs
  and find the update flow without visiting the login page.

**Verification**
- 81/81 unit tests · production build ✓ · APK rebuilt with the Settings row
  (5.8 MB) and re-uploaded to the GitHub release (sha256 re-verified ✓).

---

## [2026-08-13] — v1.1.0 release: checksum verification, public-page redirect fix, e2e + GitHub release

**APK checksum verification (login page)**
- Login page now shows the published SHA-256 for the current build and a
  "Verify checksum" panel: pick the APK you downloaded and the browser hashes
  it (WebCrypto) and compares — ✓ MATCH / ✕ MISMATCH. Perfect for the
  no-Play-Store model where users sideload from any mirror.

**Bug fix: public pages redirected to /login**
- `shouldSkipLoginRedirect` only knew the auth + admin paths, so when the
  backend was reachable a 401 from session restore hard-redirected logged-out
  users away from `/privacy-policy`, `/terms`, `/forgot-password` and the new
  `/install` — making the "public" pages unreachable. The skip list now
  matches every route without `<ProtectedRoute>`; unit tests added.

**E2E coverage (CI)**
- `mobile-layout.spec.js` gains an "install guide + version display" block
  (iPhone + Pixel 7): `/install` renders without overflow/crash, and the login
  page shows the version line, the install link and the checksum toggle.

**GitHub release channel**
- `scripts/create-github-release.js` (`npm run release:github`): reads
  `version.json` + the newest CHANGELOG entry, creates/updates a release
  tagged `v{version}` and uploads the APK (idempotent — replaces the asset on
  re-runs). Token from `GITHUB_TOKEN` (CI) or the git credential helper.
- Released: **v1.1.0** at
  `https://github.com/benivanny14/Genz-whatsapp/releases/tag/v1.1.0` — asset
  sha256 verified against `version.json` ✓.

**Verification**
- Frontend: 81/81 unit tests · production build ✓ · **full mobile-layout e2e
  suite 5/5 ✓** (iPhone + Android sweeps incl. all 130 feature panels, the 2
  new install-guide tests, and the admin dashboard) against a live stack:
  isolated MongoDB + backend :5055 + built dist :5176.
- APK v1.1.0 rebuilt with all of the above, 5.8 MB, signed, sha256 published
  (re-uploaded to the GitHub release and re-verified ✓).

---

## [2026-08-13] — v1.1.0 APK: in-app update banner, install guide page + 44% smaller APK

**In-app update banner (APK)**
- `@capacitor/app` + `UpdateBanner.jsx`: the installed APK compares its own
  versionCode (`App.getInfo()`) against `/version.json` (written by
  `npm run apk:build`) and shows a dismissible teal banner — "Update
  available — vX.Y.Z" — with a one-tap APK re-download. Renders nothing on
  the web and never when up to date.

**How-to-install page**
- New `/install` route (lazy-loaded): bilingual (Kiswahili/English) guide to
  the Chrome download flow — unknown-source permission, Play Protect prompt,
  updates; linked from the login page under the Download button.

**APK size: 10.5 MB → 5.8 MB (−44%)**
- The previous release APK embedded a 4.6MB copy of itself
  (`assets/public/genz-whatsapp.apk`); `apk:build` already strips it from
  dist before `cap sync`, and the rebuilt APK is verified clean (unzip check).
- Replaced the two ineffective dynamic imports in `capacitorBridge.js` with
  static imports (fixes Vite's INEFFECTIVE_DYNAMIC_IMPORT warnings); the
  auth chain is now node-ESM-clean (`.js` extensions on tokenStore/authFetch/
  deviceIdentity/db/blobUtils) and `resolveApiBase` guards against missing
  `import.meta.env` — frontend suite grew 75 → 80 tests, all passing.

**Release**
- v1.1.0 (versionCode 2) built and signed; `version.json` now carries the
  matching sha256 (users can verify the APK they downloaded).

**Verification**
- Frontend: 80/80 unit tests · production build ✓ (no ineffective-import
  warnings) · check:jsx ✓ · login + /install verified in the live preview.

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
