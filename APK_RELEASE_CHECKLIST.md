# APK Release Checklist

Use this list before shipping a GENZ WhatsApp Android build. Do not commit secrets, keystores, or Firebase private keys.

## GitHub Secrets

Add these in the repository **Settings → Secrets and variables → Actions**:

| Secret | Purpose |
| --- | --- |
| `ANDROID_KEYSTORE_B64` | Base64 of the release `.jks` / `.keystore` |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias |
| `ANDROID_KEY_PASSWORD` | Key password |
| `FIREBASE_GOOGLE_SERVICES_JSON_B64` | Base64 of `google-services.json` (package `app.genzwhatsapp`) |
| `VITE_API_URL` | Production API origin, e.g. `https://genz-whatsapp.onrender.com` |
| `VITE_SOCKET_URL` | Production socket origin (usually same as API) |

Encode files (Git Bash / Linux / macOS):

```bash
base64 -w 0 release.jks > release.jks.b64
base64 -w 0 google-services.json > google-services.json.b64
```

PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("release.jks")) | Set-Content -NoNewline release.jks.b64
```

## Firebase setup

Backend (Render / server env, **not** Git):

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (keep `\n` escaped)
- Optional: `FIREBASE_SERVICE_ACCOUNT` JSON string instead of the split vars

Android:

- Copy `frontend/android/app/google-services.json.example` to `frontend/android/app/google-services.json`
- Replace placeholders with the Firebase Android app for `app.genzwhatsapp`
- CI writes this file from `FIREBASE_GOOGLE_SERVICES_JSON_B64`

## Keystore setup

- Keep one release keystore. Do not overwrite it or Play / update installs will fail.
- Local default path: `frontend/android/keystore/release.jks`
- Passwords live only in environment variables / GitHub Secrets.
- `*.jks`, `*.keystore`, and `google-services.json` are gitignored.

## Local release build

From `frontend/`:

```powershell
$env:KEYSTORE_PATH="C:\path\to\release.jks"
$env:KEYSTORE_PASSWORD="..."
$env:KEY_ALIAS="..."
$env:KEY_PASSWORD="..."
$env:VITE_API_URL="https://genz-whatsapp.onrender.com"
$env:VITE_SOCKET_URL="https://genz-whatsapp.onrender.com"
npm ci --legacy-peer-deps
npm run apk:build
```

Linux / macOS:

```bash
export KEYSTORE_PATH=/path/to/release.jks
export KEYSTORE_PASSWORD=...
export KEY_ALIAS=...
export KEY_PASSWORD=...
export VITE_API_URL=https://genz-whatsapp.onrender.com
export VITE_SOCKET_URL=https://genz-whatsapp.onrender.com
npm ci --legacy-peer-deps
npm run apk:build
```

`npm run apk:build` bumps `versionCode`, runs `vite build`, `npx cap sync android`, `assembleRelease`, copies the signed APK, writes `version.json`, and verifies V1 + V2 with `apksigner`.

Manual Gradle:

```bash
cd frontend/android
./gradlew assembleRelease
```

APK output: `frontend/android/app/build/outputs/apk/release/app-release.apk`

Canonical copy: `frontend/public/downloads/genz-whatsapp.apk`

## GitHub Release

Workflow: `.github/workflows/build-apk.yml`

- Runs on `push` to `main`, any tag, and **workflow_dispatch**
- Fails immediately if required secrets are missing
- Uploads APK + `version.json` as an artifact
- Creates or updates a GitHub Release **only on tags** and attaches the APK

Tag example:

```bash
git tag v1.0.2
git push origin v1.0.2
```

Do not claim a GitHub Release exists until this workflow succeeds on GitHub.

## Chrome download link

Expected production URLs (same origin as the Node server):

- Page: `https://genz-whatsapp.onrender.com/download`
- JSON: `https://genz-whatsapp.onrender.com/downloads/version.json`
- APK: `https://genz-whatsapp.onrender.com/downloads/genz-whatsapp.apk`
- Legacy APK: `https://genz-whatsapp.onrender.com/downloads/genz-whatsapp-latest.apk`

Local:

```bash
curl -I http://localhost:5000/download
curl http://localhost:5000/downloads/version.json
curl -I http://localhost:5000/downloads/genz-whatsapp.apk
```

On Android Chrome: open `/download`, tap **DOWNLOAD APK**, allow installs from Chrome if prompted, install over the previous build (do not uninstall first if you want to keep data).

## Version / SHA verification

After a signed build:

```bash
node -e "console.log(require('./frontend/config/app-version.json'))"
```

Confirm:

- `versionName` / `versionCode` match `frontend/config/app-version.json`, `frontend/package.json`, `frontend/capacitor.config.json`, and Android `versionCode` / `versionName`
- `sha256` in `version.json` matches the APK
- `size` matches the APK byte length
- `genz-whatsapp.apk` and `genz-whatsapp-latest.apk` are identical
- V1 and V2 both report `true`

```bash
apksigner verify --verbose --print-certs frontend/public/downloads/genz-whatsapp.apk
```

## FCM device testing

Requires Firebase secrets, a signed APK with matching `google-services.json`, and a physical device or emulator with Google Play:

1. Log in, grant notification permission when prompted (after auth, not on first splash).
2. Confirm backend stored an FCM token (`POST /api/notifications/fcm/register`).
3. Send a direct message, group message, status, and call-like event with the app closed.
4. Tap the notification and confirm the matching chat / group / status opens.
5. Foreground: in-app socket UI should show the message without a duplicate system banner.

## Media / permission testing

On device, trigger each feature so the runtime prompt appears then:

- Camera capture
- Gallery photo / video
- Audio / document picker
- Location share
- Contact share
- Voice recording (screen should stay awake)
- Video playback (screen should stay awake)
- Deny once, then “Don’t ask again”: UI should fail gracefully, no crash

## Rollback

1. Re-publish the previous signed APK + previous `version.json` (`versionCode` must stay lower than any newer build you still want to offer).
2. Restore the previous Git tag / GitHub Release assets.
3. Do not generate a new keystore.
4. If a bad `versionCode` was shipped too high, ship a higher code with the last known-good web bundle; never decrease `versionCode` for Play-style update installs.

## Honest verification status

Fill this in after you actually run the commands:

- Local `npm run apk:build`:
- `apksigner` V1/V2:
- Local `/download` routes:
- GitHub Actions:
- GitHub Release:
- Production download URL:
- Physical device / emulator:
- FCM closed-app test:
