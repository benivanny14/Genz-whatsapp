# GENZ WhatsApp — Mobile Readiness Report

Status: **✅ PASS** — the web app renders and behaves correctly on modern phone
viewports (iPhone and Android), including all 130 feature panels.

Verified **2026-08-13** against the dev stack using Playwright device emulation
(`frontend/e2e/mobile-layout.spec.js`).

---

## Methodology

Playwright emulates two devices with realistic mobile viewports, touch support
and device-pixel-ratio:

| Device | Viewport | DPR |
|---|---|---|
| iPhone 13 | 390 × 844 | 3 |
| Pixel 7 (Android) | 412 × 915 | 2.625 |

Each device is driven through a real login, then these screens are checked:

- Chat list (`/chat`) — header, filter pills, search, conversation rows, bottom nav
- Chat area — message bubbles + composer
- Settings (`/settings`)
- Status (`/status`)
- Broadcast (`/broadcast`)
- Feature Library (`/features`) — **all 130 feature panels**, opened one by one
- Admin panel — login (username → password → TOTP) + dashboard

Two assertions run on every screen:

1. **No horizontal overflow** — `document.documentElement.scrollWidth` must not
   exceed the viewport width, and no element may extend past the right edge.
2. **No React crash** — any uncaught `pageerror` (except known test-environment
   noise such as Playwright's blocked service worker) fails the test.

---

## Results

| Screen | iPhone 13 | Pixel 7 |
|---|---|---|
| Login / chat list | ✅ | ✅ |
| Chat area | ✅ | ✅ |
| Settings | ✅ | ✅ |
| Status | ✅ | ✅ |
| Broadcast | ✅ | ✅ |
| Feature Library grid | ✅ | ✅ |
| **All 130 feature panels** | ✅ no crash, ✅ no overflow | ✅ no crash, ✅ no overflow |
| Admin dashboard | ✅ | ✅ |

**Totals: 27/27 Playwright specs pass** in the full e2e suite, including the
mobile-layout spec on both devices.

The app already ships a mobile-optimized layout: a bottom navigation bar
(Chats / Status / Communities / Me), horizontal filter pills, and a
full-screen chat view — all confirmed rendering correctly at phone widths.

---

## Crashes found and fixed during this sweep

Testing every feature panel on phone viewports surfaced 8 real crash bugs (all
would have hit production too, not just mobile):

| Component | Bug | Fix |
|---|---|---|
| `BusinessProfileManager.jsx` | `<X>` icon used without import → `ReferenceError: X is not defined` | added `X` import |
| `AccountManagement.jsx` | `<Sync>` — not an export of lucide-react v0.294 | replaced with `RefreshCw` |
| `MessageQuoting.jsx` | rendered a user *object* (`{_id, username}`) inside a `<span>` → "Objects are not valid as a React child" | `senderName()` helper |
| `PaymentFeatures.jsx` | `<Upload>` used without import | added import |
| `PaymentFeaturesManager.jsx` | `<Eye>` used without import | added import |
| `QRCodeSharing.jsx` | `<Check>` used without import | added import |
| `SecureBackup.jsx` | `<Eye>` / `<EyeOff>` used without imports | added imports |
| `ArchiveChats.jsx` | `<Unpin>` — not a lucide export; crashed when an archived chat was pinned | replaced with `PinOff` |

A reusable static check (`npm run check:jsx`, `scripts/check-jsx-imports.mjs`)
now scans every JSX file for tags used without an import and fails the build in
CI, so this class of crash cannot regress.

## Layout / behavior notes

- **Zero horizontal overflow** on every screen measured — no sideways scroll,
  no clipped panels.
- Geolocation (Location Picker), notifications (Popup Notification) and
  demo-only group API 404s (Group Invite Link / Group Events with a fake group
  id) are browser/demo-environment artifacts, not app bugs — verified healthy
  via direct API calls.
- Long messages wrap correctly inside bubbles and list previews are truncated
  with ellipsis.

## Screenshots

See `docs/mobile-screenshots/` (iPhone-* and Android-*: chat list, chat area,
settings, status, feature library, admin dashboard).

## Android APK (installable app)

GENZ ships as a **real signed APK** built with [Capacitor 8](https://capacitorjs.com),
which wraps the production web app in a native Android WebView — no NDK, no
React Native runtime needed.

- **Download**: the login page has a *Download Android App* button serving
  `/genz-whatsapp.apk` (also available at
  `https://genz-whatsapp-1.onrender.com/genz-whatsapp.apk` — the UI host).
  There is **no GitHub download channel** — the site is the only source of
  the APK.
- **Production topology**: the UI is served from `genz-whatsapp-1.onrender.com`
  while the API (and its MongoDB) is `genz-whatsapp.onrender.com` — the host
  baked into the deployed web app and the APK, so web and APK users share one
  account database. Merging the two services into one host is a Render
  dashboard task (`docs/APK_RELEASE_CHECKLIST.md` → “Production topology”).
- **API**: the APK build bakes in `VITE_API_URL` (defaults to the production
  Render URL) — the webview talks to the live API with cookies
  (`SameSite=None; Secure` in production), and the backend CORS/CSRF allowlist
  includes the Capacitor webview origins (`https://localhost`,
  `capacitor://localhost`).
- **Build**: `npm run apk:build` reproduces the whole pipeline
  (web build → `cap sync android` → `gradlew assembleRelease` → copy to
  `public/genz-whatsapp.apk`).
- **Signing**: release builds are signed with `frontend/android/genz-release.keystore`
  configured via gitignored `frontend/android/keystore.properties`. Back those up —
  they are not in git and are required to ship updates with the same signature.
- **Native push + media downloads** (`src/services/capacitorBridge.js`): the APK runs
  the web app in a Capacitor WebView with 4 native plugins wired in:
  - `@capacitor/push-notifications` — registers an FCM token and POSTs it to
    `/api/notifications/fcm/register`; incoming pushes feed the same in-app toasts
    the web app uses. Requires `android/app/google-services.json` + a Firebase
    project to deliver background pushes (see `capacitor.config.json`).
  - `@capacitor/local-notifications` — system notifications for messages when
    the app runs in the WebView (web Notification API is unavailable there).
  - `@capacitor/filesystem` + `@capacitor/share` — downloads (documents, voice
    notes, QR codes, chat exports) fetch/save to the device and open the system
    share sheet; browsers keep the classic anchor download.

## iOS build (same web app, Xcode required)

The same Capacitor project also ships an **iOS target** (`frontend/ios/`,
created with `npx cap add ios`) with the GENZ AppIcon (1024×1024) and a dark
branded splash — regenerable via `frontend/scripts/generate-ios-icons.js`.
Building requires macOS + Xcode; `npx cap sync ios` then open
`ios/App/App.xcworkspace`. Bundle id: `com.benivanny.genzwhatsapp`.
Push notifications need the Firebase iOS setup — see `docs/FCM_SETUP_GUIDE.md`.

## Releases (Chrome download — no Play Store)

APKs are distributed **directly from the site** (login page *Download Android
App* button), never through the Play Store. Each release:

1. `npm run bump:apk` (`scripts/bump-app-version.js`) — bumps Android
   versionCode/versionName + iOS build/version and rewrites
   `public/version.json`.
2. `npm run apk:build` — rebuilds the signed APK and fills sha256/size into
   `public/version.json` (served at `/version.json`; the login page shows
   `GENZ WhatsApp Android vX.Y.Z` under the download button so users can
   check for updates).
3. Commit + push → Render serves the new APK automatically.

Full procedure, keystore-backup warnings, user install flow and rollback:
`docs/APK_RELEASE_CHECKLIST.md`.

## Live phone preview (dev)

`frontend/phone-preview.html` (served by the Vite dev server at
`/phone-preview.html`) wraps the running app in an iPhone 13 / Pixel 7 frame at
real device dimensions — toggle devices and reload from the toolbar. It is a
dev-only utility: it embeds the app same-origin (so the auth cookie works) and
is not included in production builds.

## Running the check

```bash
# Full mobile sweep (requires an isolated e2e MongoDB):
#   MONGODB_URI / MONGO_URI must point at the SAME isolated database,
#   PHONE_VERIFICATION_REQUIRED=false, backend reachable at PLAYWRIGHT_BASE_URL.
cd frontend
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5176 \
MONGODB_URI=mongodb://127.0.0.1:27017/genz-e2e-test \
MONGO_URI=mongodb://127.0.0.1:27017/genz-e2e-test \
npx playwright test e2e/mobile-layout.spec.js

# Missing-import scan (also runs in CI):
npm run check:jsx
```

> ⚠️ **After `npm run apk:build`:** the pipeline rebuilds `dist/` with the
> production `VITE_API_URL` baked in, so the e2e login would hit the live API
> instead of the local backend. Re-run a plain `npm run build` (no env vars)
> before running the specs locally — the bundle then falls back to `/api`.

The mobile-layout spec runs automatically in the GitHub Actions e2e job on
every push/PR.
