# GENZ WhatsApp — APK Release Checklist (Chrome download — NO Play Store)

> **Model yetu:** app inasambazwa kama APK **inayodownloadiwa moja kwa moja
> kupitia Chrome** kutoka kwenye tovuti — **hatutumii Play Store**. Hii
> inamaanisha sisi tunadhibiti mzunguko wa release, hakuna review ya Google,
> na watumiaji wanapata update kwa kurudi tena kwenye tovuti (au kupitia
> banner ya version kwenye login page).
>
> Kila release inafuata mzunguko huu: **bump version → build APK → commit →
> Render deploy → watumiaji wadownload update.**

---

## Kabla ya release (mara ya kwanza tu)

- [ ] **Backup keystore** — `frontend/android/genz-release.keystore` +
      `frontend/android/keystore.properties` ni **gitignored**. Hifadhi
      nakala kwenye password manager / secure drive. **Ukizipoteza huwezi
      kutoa update** kwa watumiaji walio-install version ya sasa (Android
      inahitaji sahihi ile ile kwa update install).
- [ ] Thibitisha `frontend/android/local.properties` iko (sdk.dir) kwenye
      mashine ya build.
- [ ] (Optional) Firebase imewekwa — tazama `docs/FCM_SETUP_GUIDE.md` kwa
      push notifications halisi.

---

## Kila release (hatua kwa hatua)

### 1. Bump version
```bash
cd frontend
node scripts/bump-app-version.js patch    # 1.0.0 → 1.0.1 (versionCode +1)
#   au: node scripts/bump-app-version.js minor  |  major  |  2.1.0
```
Hii inabumia:
- `android/app/build.gradle` → `versionCode` +1, `versionName`
- `ios/App/App.xcodeproj/project.pbxproj` → `CURRENT_PROJECT_VERSION` +1,
  `MARKETING_VERSION`
- `public/version.json` → version mpya (sha256/size zitajazwa na build)

> **Muhimu:** `versionCode` lazima iongezeke kila release — ndiyo njia pekee
> Android inayojua kuna update kwenye reinstall.

### 2. Build APK
```bash
npm run apk:build
```
Pipeline: web build → `cap sync android` → `gradlew assembleRelease`
(ime-signed na release keystore) → `public/genz-whatsapp.apk` +
`public/version.json` (sasa ina **sha256 + size** halisi).

### 3. Verify (mashine au kifaa halisi)
- [ ] APK ina-install kwenye Android test device (na inaweza kusajiliwa juu
      ya version ya zamani bila kufuta data).
- [ ] Fungua app → login page inaonyesha **"GENZ WhatsApp Android vX.Y.Z"**.
- [ ] Download button inatoa APK mpya; `curl https://GENZ-URL/genz-whatsapp.apk`
      inalingana sha256 na `public/version.json`:
      ```bash
      sha256sum genz-whatsapp.apk
      ```

### 4. Commit + deploy
```bash
git add android/app/build.gradle ios/App/App.xcodeproj/project.pbxproj public/genz-whatsapp.apk public/version.json
git commit -m "release: v1.0.1 APK"
git push
```
Render ina-deploy automatically (web build inakopi `public/` → `dist/`), na
`https://genz-whatsapp.onrender.com/genz-whatsapp.apk` inatoa APK mpya mara
moja.

### 5. Tangaza update kwa watumiaji
- Watumiaji waliopo: fungua tovuti kwenye Chrome → login page inaonyesha
  version ya sasa → **Download Android App** → Chrome ina-install juu ya
  ile ya zamani (data inabaki, kwa sababu sahihi iko sawa).
- Unaweza kutuma broadcast/status kwenye app yenyewe kuwaelekeza.

---

## Mzunguko wa install kwa watumiaji (Chrome)

1. Fungua URL ya tovuti kwenye **Chrome** (Android).
2. Bonyeza **Download Android App** → Chrome inapakua `genz-whatsapp.apk`.
3. Chrome inaonyesha onyo la kwanza: *"This type of file can harm your
   device"* → bonyeza **OK / Download anyway** (kawaida kwa APK zote
   zisizo za Play Store).
4. Bonyeza notification ya download → skrini ya install inaonekana.
5. Ikiwa OS inauliza: **Allow from this source** kwa Chrome (Install unknown
   apps) → ruhusu.
6. **Google Play Protect** inaweza kuonyesha: *"Play Protect doesn't recognize
   this app's developer"* → **More details → Install anyway** (sahihi halisi
   ya keystore yetu inamaanisha app ni salama; onyo hili linatokea kwa app
   yoyote iliyodownloadiwa nje ya Play Store).

---

## Troubleshooting

| Tatizo | Suluhisho |
|---|---|
| "App not installed" wakati wa update | versionCode haijaongezeka, au keystore tofauti. Rejesha keystore sahihi, bump versionCode. |
| APK ndogo sana / download 404 | `public/genz-whatsapp.apk` haipo kwenye repo au dist haija-built upya. Rebuild + commit. |
| Play Protect inaonya "untrusted" | Kawaida kwa sideload — usemi "Install anyway". Hakikisha tuna-build na release keystore (sio debug) ili isiwe mbaya zaidi. |
| Users wanaweka version ya zamani | Onyesha version kwenye login page na u-tangaze update; hatuna auto-update kwa sababu hatuko Play Store. |
| APK ina-upload polepole | APK ni ~10MB; ina-serve kutoka dist ya Render — hakikisha disk space ya Render inatosha. |

---

## Rollback (ikiwa release ina tatizo)

1. Rejesha commit ya zamani ya `public/genz-whatsapp.apk` + `version.json`:
   ```bash
   git checkout <old-release-commit> -- public/genz-whatsapp.apk public/version.json
   git commit -m "revert: roll back APK to vX.Y.Z"
   git push
   ```
2. Watumiaji wanaweza kudownload version ya zamani — **sio lazima wafute**
   app (reinstall ya versionCode ndogo hairuhusiwi na Android!). Ikiwa
   versionCode imekwenda juu kwa makosa, bump tena juu zaidi kwa fix.
3. Kwa fix ya haraka ya v1.0.1: bump `patch` → `1.0.2` (versionCode +1 tena)
   na rebuild — hii inaweza ku-install juu ya 1.0.1 bila tatizo.

---

## Version endpoints (kwa developers)

- `https://GENZ-URL/version.json` → `{ version, versionCode, apkUrl, sha256, size, releasedAt }`
- `https://GENZ-URL/genz-whatsapp.apk` → APK yenyewe (kwa Chrome download)

Scripts: `frontend/scripts/bump-app-version.js` · `frontend/scripts/build-apk.js`
