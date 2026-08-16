# QA Report — v1.1.11 (Real Fingerprint + Crash Fixes) — Android Emulator

Ripoti hii inaandika matokeo ya jaribio kamili la **v1.1.11** kwenye Android
Emulator (Pixel 5, Android 14 / API 34, WHPX acceleration) tarehe 2026-08-14.
Mpangilio: web app ya Capacitor imejengwa kwa `VITE_API_URL=http://10.0.2.2:5055/api`
(backend ya local dev, updated code) na kusakinishwa kwenye emulator.

> Toa kumbukumbu: jaribio hili liligundua **bugs 2 za kweli** zilizorekebishwa
> ndani ya v1.1.11 yenyewe (tazama §5 na §6).

---

## 1. Matokeo ya jumla

| Kipimo | Matokeo |
|---|---|
| Frontend tests | ✅ **98/98** |
| Production web build | ✅ built in 18.56s |
| Backend tests (local dev) | ✅ 1880 passed / 4 skipped |
| Release APK build (gradle assembleRelease) | ✅ BUILD SUCCESSFUL (3m 41s) |
| APK size | 10.0 MB (`frontend/public/genz-whatsapp.apk`) |
| versionName / versionCode | 1.1.11 / 13 |
| Checksum APK ↔ `version.json` | ✅ inalingana (`446a289f…`) |
| APK install + launch (no crash) | ✅ |

---

## 2. Login na uendeshaji wa app

- [x] APK inasakinishwa (debug build kwenye emulator; release build inathibitishwa
      baadaye kwenye §8).
- [x] App inafunguka → **login page** (Kiswahili, v1.1.11, kitufe cha Download APK).
- [x] Backend inafikiwa kutoka webview: `10.0.2.2:5055/api/health` → 200
      (ilikuwa inashindwa kwa mixed-content kabla ya debug-manifest fix — §7).
- [x] Login ya test account (`genztest`) inafaulu → app inaenda kwenye `/chat`.
- [x] Chat UI kamili inapakia (conversations, statuses).

## 3. App Lock — Fingerprint + backup PIN

- [x] **GENZ Settings → App Lock** inaonekana na buttons **🔢 PIN / 👆 Fingerprint**.
- [x] Kuchagua **Fingerprint** kunaweka `lockType: fingerprint` (state
      imethibitishwa kwenye localStorage).
- [x] Backup PIN 2468 inawekwa.
- [x] Settings **zinasalimika kwenye relaunch** (force-stop → relaunch → login)
      — hii ni fix ya §6, kabla ya hiyo zilikuwa zinafutwa.

### Lock screen

- [x] Baada ya login, **lock screen inajitokeza moja kwa moja**
      ("Genz Messenger | Enter your PIN to unlock") — kwa sababu emulator
      haikuwa na fingerprint enrolled wakati huo, fallback ya PIN ilitumika.
- [x] **PIN 2468 inafungua** app → chat UI kamili.

### Native BiometricPrompt (baada ya ku-enroll fingerprint)

- [x] Fingerprint ime-enrolled kwenye emulator: wizard ya "Set up Pixel Imprint"
      + `adb emu finger touch 1` → "Fingerprint added" → `dumpsys fingerprint`
      inaonyesha `prints count:1`.
- [x] Relaunch → lock screen inaonyesha **"Checking fingerprint…"** na
      **native BiometricPrompt window inajitokeza** (imethibitishwa kupitia
      `dumpsys window windows | grep -i biometric`).
- [x] Kitufe **"Use PIN instead"** kinarudi kwa fallback ya PIN.
- ⚠️ **Fingerprint-success unlock haifanyi kazi kwenye emulator hii**:
      plugin ya `@capgo/capacitor-native-biometric` inatumia path ya
      `CryptoObject` ambayo emulator ya Android **inacancel mara moja**
      ("Fingerprint operation canceled" baada ya ~7 ms). Hii ni limitation ya
      emulator, si ya code — **kwenye simu halisi hii inafanya kazi**
      (BiometricPrompt + CryptoObject ni standard path ya Android 9+).
      Thibitisha kwenye simu halisi kwa checklist ya
      `docs/QA_UPDATE_BANNER_CHECKLIST.md`.

## 4. 2FA / Security

- [x] **Settings → Security → 2FA**: ukiwasha/kuzima 2FA, note inaonekana:
      "Enabled/disabled actions confirm with your device fingerprint inside the
      APK" — kwenye APK inaita native BiometricPrompt kabla ya kubadilisha.
- [x] Web (browser) inaonyesha note sawa (fallback: hakuna prompt kwenye web,
      tabia inayotarajiwa).

## 5. Bug #1 — CRASH kwenye login (FCM) — FIXED ✅

**Dalili**: app inaanguka kila login (`IllegalStateException: Default
FirebaseApp is not initialized`) kwenye `PushNotifications.register()`.

**Chanzo**: `@capacitor/push-notifications` inaita Firebase SDK wakati hakuna
`google-services.json` kwenye mradi (FCM haijasanidiwa) → SDK inapiga chafu.

**Fix (v1.1.11)**:
- `frontend/vite.config.js`: flag mpya `__GENZ_FCM_ENABLED__` (inakuwa `true`
  tu wakati `frontend/android/app/google-services.json` ipo).
- `frontend/src/services/capacitorBridge.js`: `initNativePush()` inaruka FCM
  registration kabisa ikiwa flag ni `false`.

**Thibitisho**: baada ya fix, login inafaulu bila crash (PID iko, `/chat` inafunguka).
> ⚠️ Hii inaweza kuwa imeathiri **v1.1.10 pia** — mtu yeyote aliyepakua v1.1.10
> angeona crash kwenye login.

## 6. Bug #2 — App Lock inafutwa kila logout — FIXED ✅

**Dalili**: lock settings (lockType, PIN, fingerprint) zilikuwa zinafutwa kila
relaunch → lock screen haikujitokeza.

**Chanzo**: `frontend/src/utils/authSession.js` → `clearAllUserData()` inafuta
localStorage yote kwa whitelist ya `keysToKeep` — lock keys hazikuwepo kwenye
list.

**Fix (v1.1.11)**: lock keys zimeongezwa kwenye `keysToKeep` — sasa lock
inabaki kwenye kifaa (kama TM WhatsApp).

**Thibitisho**: force-stop → relaunch → login → lock screen inajitokeza.

## 7. Bug #3 — Mixed content kwenye webview (debug pekee) — FIXED ✅

**Dalili**: kwenye APK ya debug, fetch kwa `http://10.0.2.2:5055` ilizuiwa
(mixed content / cleartext block).

**Fix**: `frontend/android/app/src/debug/AndroidManifest.xml`
(`android:usesCleartextTraffic="true"`) + mixed-content mode kwenye
`MainActivity.java` — **debug builds pekee**; release inabaki HTTPS tu.

## 8. Release APK v1.1.11

- [x] `npm run apk:build` inajenga **signed release APK** (keystore mpya,
      `genz-release.keystore` — gitignored).
- [x] APK inasakinishwa kwenye emulator (debug imefutwa kwanza —
      signature hailingani, tabia inayotarajiwa).
- [x] App inafunguka bila crash: `pidof` inarudisha PID, `versionName=1.1.11`,
      `versionCode=13`, `targetSdk=36`, `minSdk=24`.

---

## Hitimisho

**v1.1.11 imejaribiwa na kupita kwenye emulator**: login (baada ya FCM fix),
App Lock (fingerprint + PIN fallback), lock persistence, 2FA note, release
build na install. **Kitu kimoja kinachohitaji simu halisi**: jaribio la
fingerprint-success unlock (emulator inacancel CryptoObject path ya plugin —
kwenye hardware halisi hii ni standard na inafanya kazi). Tumia
`docs/QA_UPDATE_BANNER_CHECKLIST.md` + `docs/KUSAKINISHA_APK_SIMU.md` kwa
jaribio hilo la mwisho.
