# QA Checklist — Update Banner & APK Distribution (real Android phone)

Manual end-to-end test for the update experience, done on a **real Android
phone** (not an emulator) because it exercises sideloading, Play Protect and
the WebView service worker — none of which an emulator reproduces faithfully.

> Prerequisites: a phone running Android 8+, Chrome installed, and the APK
> from the GitHub release (`https://github.com/benivanny14/Genz-whatsapp/releases`).
> You need to be able to trigger a deploy (push to `main`) to test the
> "new version available" cases.

---

## 0. Fresh install (first time)

- [ ] Download `genz-whatsapp.apk` from the GitHub release page on the phone.
- [ ] Chrome asks about unknown sources → allow it (Settings → Apps → Chrome →
      Install unknown apps → allow) and tap **Install anyway** if Play Protect
      warns.
- [ ] Open GENZ → login page shows the app version under the download button,
      e.g. **"GENZ WhatsApp Android v1.1.3"**.
- [ ] Tap **Verify checksum** → select the downloaded APK → **✓ MATCH** (compares
      SHA-256 against the published checksum).
- [ ] Log in → the app works (chat, send a message, receive a message).

## 1. Up-to-date = no banner

- [ ] With the latest release installed and the latest code deployed, open the
      app several times (fresh start, background → foreground).
- [ ] **No "Update available" banner** should appear.
- [ ] Settings → Help → "Android app version" matches the latest release.

## 2. New release detection (APK)

1. Install an OLD build (e.g. v1.1.2 APK from an older GitHub release) on the
   phone.
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

- [ ] Tap **Update** → download starts from **GitHub** (reliable channel).
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

## 4. Offline & edge cases

- [ ] Airplane mode + open app (previously used) → app opens with cached chats
      and the "connecting…" indicator (the SW v5 shell), **no update banner**
      (version.json unreachable — correct).
- [ ] `https://genz-whatsapp-1.onrender.com/version.json` returns
      `Cache-Control: no-cache` (curl -I) — the banner can never be stuck on a
      stale cached copy.
- [ ] The APK download from the site works OR gracefully redirects to GitHub
      when the free-tier instance stalls (the login button's smart fallback).

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
- A version that is deployed but whose APK release wasn't created yet will
  show the banner with a **Site** button only (GitHub asset 404s until
  `release.yml` finishes — usually < 2 min after the tag).
