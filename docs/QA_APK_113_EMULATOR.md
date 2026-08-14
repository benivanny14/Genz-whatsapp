# QA Report — v1.1.13 (APK Deployment Fixes) — Android Emulator

Ripoti hii inaandika matokeo ya jaribio la **v1.1.13** (versionCode 15) kwenye
Android Emulator (AVD `genz-test`, Android 14 / API 34, x86_64, headless)
tarehe 2026-08-14. Mpangilio: **release APK halisi** kama inavyosambazwa kwenye
tovuti (`https://genz-whatsapp-1.onrender.com/genz-whatsapp.apk`), iliyosakinishwa
kwenye emulator. Uthibitisho ulifanyika kupitia **Chrome DevTools Protocol**
(kwa sababu `screencap` ilikufa baada ya SystemUI ANR kwenye headless emulator —
text/DOM checks zilifanya kazi vizuri).

> Jaribio hili liligundua **bug 2 za production** zilizorekebishwa ndani ya
> v1.1.13 yenyewe: (1) `/genz-whatsapp.apk` ilikuwa inaserve `index.html`
> (gitignore trap), na (2) WebView ya APK ilikuwa inapakia API-only host na
> kuonyesha "Cannot GET /" (server.url mbaya). Tazama CHANGELOG.

---

## 1. Matokeo ya jumla

| Kipimo | Matokeo |
|---|---|
| Frontend tests | ✅ **97/97** |
| Production web build | ✅ built (PWA v1.3.0) |
| Backend tests | ✅ 1880 passed / 4 skipped |
| Playwright e2e | ✅ **34/34** (mobile-layout, admin, abuse-report, voice) |
| Release APK build (gradle assembleRelease) | ✅ BUILD SUCCESSFUL (~1m) |
| versionName / versionCode | 1.1.13 / 15 |
| APK size | 10,595,824 bytes (~10.1 MB) |
| Checksum APK ↔ `version.json` | ✅ inalingana (`e336da12…`) |
| Production `/version.json` | ✅ v1.1.13 / code 15 / sha `e336da12…` |
| Production `/genz-whatsapp.apk` | ✅ Zip archive halisi, sha inalingana (sio HTML!) |
| APK install + launch (no crash) | ✅ |
| WebView URL baada ya launch | ✅ `https://genz-whatsapp-1.onrender.com/login` (sio "Cannot GET /") |

---

## 2. WebView inapakia site halisi (fix ya server.url)

- [x] Release APK imesakinishwa kwenye emulator (fresh install baada ya wipe-data).
- [x] `am start` inafungua `MainActivity` → `topResumedActivity` =
      `com.benivanny.genzwhatsapp/.MainActivity`.
- [x] Hakuna `AndroidRuntime:E` crashes kwenye logcat.
- [x] Kupitia Chrome DevTools remote debugging (`adb forward` +
      `localabstract:webview_devtools_remote_<pid>`):
  - URL: `https://genz-whatsapp-1.onrender.com/login` ✓
  - Title: `GENZ WhatsApp - Modern Chat Application` ✓
  - Login page kamili: **Login**, **Namba ya simu au username (e.g. +255...)**
    **Nenosiri**, **Forgot password?**, **Create account**, **Terms**, **Privacy Policy**,
    **Download Android App**, **GENZ WhatsApp Android v1.1.13**,
    **How to install — Jinsi ya kusakinisha**, **Verify checksum — Thibitisha checksum** ✓
- [x] **"GENZ WhatsApp Android v1.1.13"** inathibitisha `/version.json`
      inafikiwa kutoka kwenye WebView (relative fetch inafanya kazi).

## 3. Hakuna false "Update available" toast (fix ya main.jsx)

- [x] Fresh install (uninstall → reinstall → launch) → `document.body.innerText`
      haionyeshi "Update available" / "Reload Now" toast ✓ (kabla ya fix,
      SW `clients.claim()` ilifanya controllerchange ya kwanza ionekane kama update).

## 4. Production deployment pipeline

- [x] Merge kwenye `main` inatrigger `.github/workflows/deploy.yml`
      (backend jest + frontend build + Render deploy action) → **success**.
- [x] `https://genz-whatsapp-1.onrender.com/version.json` inaonyesha v1.1.13
      baada ya deploy.
- [x] `https://genz-whatsapp-1.onrender.com/genz-whatsapp.apk` inapakua APK
      halisi: `file` inaripoti **Zip archive**, sha256 `e336da12…` inalingana
      na `version.json` na APK ya ndani.

## 5. Vidokezo (environment notes)

- AVD `genz-test` ilikuwa na **package manager iliyoharibika** (activity
  haikuonekana ingawa manifest ilikuwa sahihi) — `-wipe-data` iliyorekebisha.
- `screencap` ilirudisha files za 0-byte baada ya **SystemUI ANR** kwenye
  headless emulator (swiftshader) — screenshot ya splash (WhatsApp green
  #075E54 + icon) ilikamatwa kabla ya hapo; text checks zilifanyika kwa
  Chrome DevTools Protocol badala yake.
- Full interactive QA (usajili, login, kutuma ujumbe) inaweza kufanywa dhidi
  ya local backend kwa QA build yenye `VITE_API_URL` local — release APK
  inaungana na production na haifai kutumika kuandika data ya test.

---

## 6. Hitimisho

**PASS** — v1.1.13 inasakinishwa, inaendesha, inapakia site halisi kutoka UI
host, inaonyesha version sahihi, na haina false update toast. APK download
kwenye production inatoa APK halisi yenye sha inayolingana. App iko tayari
kwa watumiaji.
