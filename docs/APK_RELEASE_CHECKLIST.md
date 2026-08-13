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
`https://genz-whatsapp-1.onrender.com/genz-whatsapp.apk` inatoa APK mpya mara
moja. (Ikiwa free-tier instance iko sleeping na download inachelewa, watumiaji
wanatumia link ya **GitHub mirror** kwenye login/install pages — `releases/
latest/download/genz-whatsapp.apk` — ambayo ni ya kudumu na ya kasi.)

> **Production topology (muhimu kujua):** UI ina-serve kutoka
> `genz-whatsapp-1.onrender.com`, lakini **API + MongoDB iko kwenye
> `genz-whatsapp.onrender.com`** — ndiyo host iliyobaked kwenye web app na
> APK (`build-apk.js` default), hivyo watumiaji wa web na APK wanashiriki
> database moja. **Usibadilishe VITE_API_URL default bila kubadilisha pia
> backend ambayo data iko.** Kuunganisha services hizo mbili kuwa moja ni
> kazi ya Render dashboard (sio ya repo). Unaweza kuona deploy history kwa:
> `node scripts/render-deploy-status.js` (na RENDER_API_KEY/RENDER_SERVICE_ID)
> au Actions → "Render status".

### 5. Publish GitHub release (channel ya pili ya download)

**Njia rahisi (auto):** baada ya commit + push, unda tag na GitHub Actions
itafanya yote (`.github/workflows/release.yml` ina-trigger kwenye `v*` tag):
```bash
git tag v{version} && git push origin v{version}
```

**Au kwa mkono:**
```bash
npm run release:github          # anza kutoka repo root
#   au: node scripts/create-github-release.js --dry-run  (hakikisha kwanza)
```
Script inasoma `version.json` + CHANGELOG, inaunda (au kusasisha) release
inayoitwa `v{version}` na kupakia `genz-whatsapp.apk` kama asset. Token inatoka
`GITHUB_TOKEN` (CI) au git credential helper. Re-running inabadilisha asset
badala ya kushindwa (idempotent). Watumiaji wanaweza kupakua kutoka GitHub
pia — URL ya moja kwa moja:
`https://github.com/benivanny14/Genz-whatsapp/releases/download/v{version}/genz-whatsapp.apk`

### 6. Tangaza update kwa watumiaji
- Watumiaji waliopo: fungua tovuti kwenye Chrome → login page inaonyesha
  version ya sasa → **Download Android App** → Chrome ina-install juu ya
  ile ya zamani (data inabaki, kwa sababu sahihi iko sawa).
- Ndani ya app, banner ya kijani **"Update available"** inaonekana kwa
  watumiaji walio na versionCode ndogo — bonyeza **Update** kupakua moja kwa
  moja (inahitaji version.json iwe imesasishwa kwenye server — kwa hiyo
  **deploy kwanza**, kisha watumiaji waone banner).
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
| APK ina-upload polepole | APK ni ~6MB (imepunguzwa kutoka 10.5MB kwa kuondoa APK iliyojipachika ndani yake); ina-serve kutoka dist ya Render — hakikisha disk space ya Render inatosha. |

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

## Deploy kwa Render (baada ya commit)

Render ina-deploy automatically kama service inafuatilia branch hii. Ikiwa
unataka kuitrigger kwa mkono (na RENDER_API_KEY iko kwenye env):

```bash
curl -s -X POST https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" -d '{"clearCache":false}'
```

Halafu thibitisha (script iliyopo ya repo):

```bash
node scripts/render-deploy-verify.js https://GENZ-URL
```

> **Muhimu kwa banner ya update:** `version.json` ina-serve kutoka dist ya
> Render — APK mpya + version.json mpya zinakwenda pamoja kwenye deploy moja.

## Version endpoints (kwa developers)

- `https://GENZ-URL/version.json` → `{ version, versionCode, apkUrl, sha256, size, releasedAt }`
- `https://GENZ-URL/genz-whatsapp.apk` → APK yenyewe (kwa Chrome download)

Scripts: `frontend/scripts/bump-app-version.js` · `frontend/scripts/build-apk.js`
