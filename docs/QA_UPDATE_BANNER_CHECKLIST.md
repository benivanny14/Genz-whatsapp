# QA Checklist — Update Banner & APK Distribution (real Android phone)

Manual end-to-end test for the update experience, done on a **real Android
phone** (not an emulator) because it exercises sideloading, Play Protect and
the WebView service worker — none of which an emulator reproduces faithfully.

> Prerequisites: a phone running Android 8+, Chrome installed, and the APK
> from the site itself (`/genz-whatsapp.apk` on the deployed host — there is
> **no GitHub download channel** since v1.1.11). You need to be able to
> trigger a deploy (push to `main`) to test the "new version available" cases.

---

## 0. Fresh install (first time)

- [ ] Download `genz-whatsapp.apk` from the site (Download Android App button).
- [ ] Chrome asks about unknown sources → allow it (Settings → Apps → Chrome →
      Install unknown apps → allow) and tap **Install anyway** if Play Protect
      warns.
- [ ] Open GENZ → login page shows the app version under the download button,
      e.g. **"Genz Messenger Android v1.1.3"**.
- [ ] Tap **Verify checksum** → select the downloaded APK → **✓ MATCH** (compares
      SHA-256 against the published checksum).
- [ ] Log in → the app works (chat, send a message, receive a message).

## 1. Up-to-date = no banner

- [ ] With the latest release installed and the latest code deployed, open the
      app several times (fresh start, background → foreground).
- [ ] **No "Update available" banner** should appear.
- [ ] Settings → Help → "Android app version" matches the latest release.

## 2. New release detection (APK)

1. Install an OLD build (e.g. v1.1.2 APK from an older release) on the phone.
2. Push a NEWER version to `main` (triggers the Render deploy) or bump the
   version and release.
3. Wait for `https://genz-whatsapp-1.onrender.com/version.json` to report the
   new version.
4. Open the app on the phone.

- [ ] The **green update banner** appears within a couple of seconds:
      "Update available — vX.Y.Z" with **Update** (and **Site**) buttons.
- [ ] The banner appears on the **login page** (logged out) AND **inside the
      app** (logged in) — it is global, not page-specific.

### Update flow

- [ ] Tap **Update** → download starts from the **site itself** (`/genz-whatsapp.apk`).
- [ ] Android installs the new APK **over the old one** (same signature) —
      **no data loss**: chats, contacts, settings all still there.
- [ ] After updating, open the app → **no banner** (you are now on the latest).
- [ ] Bonus: on the login page, tap **Verify checksum** on the newly
      downloaded APK → ✓ MATCH.

### Dismiss (per-version)

- [ ] With a new version available, dismiss the banner (✕).
- [ ] Kill and reopen the app → **banner stays dismissed** for that version.
- [ ] When an even newer version ships, the banner appears again.

## 3. New release detection (Web / PWA in Chrome)

- [ ] Keep a browser tab on the OLD deployed version open (do not reload) while
      a new version deploys.
- [ ] Open/refresh another tab or revisit the site later → the **update banner
      shows with a Reload button** (a stale cached bundle detected via the
      served version.json vs the bundle's build version).
- [ ] Tap **Reload** → the app loads the fresh build → banner gone, new
      features present.
- [ ] On a tab that reloaded into the new version, confirm **no banner**.
- [ ] Dismiss works the same way on web (per version).

## 3.5 Release uptake & monitoring (optional, needs opt-in data)

- [ ] Settings → Privacy → **Update Analytics** shows the explain-before-opt-in
      notice; after enabling the toggle, opening the app with a newer release
      available produces events within seconds.
- [ ] On the **login page**, once the current release has data, a muted footer
      appears: `📊 vX.Y.Z: N updated · M shown — masaa 48 ya mwisho (last 48h)`
      (only when shown > 0 — nothing is displayed with zero data).
- [ ] **Admin dashboard** → Overview → **Update Analytics (server)** panel
      shows the 30-day totals and a per-version table matching what the phone
      just sent.
- [ ] **Admin dashboard** → Overview → **Nightly Health Check** panel lists the
      last runs with ✅/❌/⏳ and links to the Actions run.

## 4. Offline & edge cases

- [ ] Airplane mode + open app (previously used) → app opens with cached chats
      and the "connecting…" indicator (the SW v5 shell), **no update banner**
      (version.json unreachable — correct).
- [ ] `https://genz-whatsapp-1.onrender.com/version.json` returns
      `Cache-Control: no-cache` (curl -I) — the banner can never be stuck on a
      stale cached copy.
- [ ] The APK download from the site works (`/genz-whatsapp.apk` serves the
      APK — no GitHub fallback exists anymore).

## 5. Regression checks after an update

- [ ] Push notifications still arrive (if FCM configured).
- [ ] Media upload/download works.
- [ ] Calling works (if configured).
- [ ] The service worker registered is v5+ (Chrome DevTools → Application →
      Service Workers shows `/service-worker.js`; or check the SW source
      contains `genz-wa-v5`).

---

## Known behaviors (not bugs)

- On the **free Render tier** the instance sleeps after ~15 min idle; the
  first request after sleep can take 30–60 s (cold start). The update banner
  may take a few seconds to appear on a cold instance.
- The APK bundled inside itself is **intentionally absent** (removed at build
  time to keep the APK small) — the app never downloads itself.
- A version that is deployed but whose APK wasn't uploaded to the server yet
  shows the banner but the Update link may 404 until `npm run apk:build`
  output is deployed.
