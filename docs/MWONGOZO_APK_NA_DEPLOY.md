# Mwongozo wa Kujenga APK na Kuweka Live (Kiswahili)

Mwongozo huu unaelezea hatua kwa hatua jinsi ya kujenga **APK ya GENZ WhatsApp**
kutoka kwenye web app (Capacitor), kuweka APK kwenye site yenyewe, na
kurekebisha deployment ya Render. (Download ya APK kupitia GitHub imeondolewa
kabisa.)

---

## Sehemu ya 1: Mahitaji (Requirements)

Kabla ya kuanza, hakikisha vitu vifuatavyo vipo:

| Kitu | Mahali | Maoni |
|---|---|---|
| Node.js 18+ | `node --version` | Iko tayari kwenye mashine yako |
| Android SDK | `C:\Users\<weye>\AppData\Local\Android\Sdk` | Tayari iko (API 28–36) |
| Java 17+ | `java -version` | Tayari iko |
| Keystore | `frontend/android/genz-release.keystore` | **HII HAIKO — lazima uiunde (Sehemu ya 2)** |
| `keystore.properties` | `frontend/android/keystore.properties` | **HII HAIKO — lazima uiunde** |
| `local.properties` | `frontend/android/local.properties` | **HII HAIKO — lazima uiunde** |

> ⚠️ Vitu vitatu vya mwisho vimefutika kutoka kwenye kompyuta yako. Kila APK
> inayojengwa mpya inahitaji keystore — **ihifadhi mahali salama** (Google Drive,
> USB) kwa sababu bila keystore hiyo hiyo, huwezi kusasisha APK iliyowekwa tayari
> kwenye simu za watumiaji.

---

## Sehemu ya 2: Kuunda Keystore (Fanya MARA MOJA tu)

Open terminal kwenye folder ya `frontend/android` na endesha:

```bash
cd frontend/android

# 1. Unda keystore (weka password kali na ukumbuke!)
keytool -genkeypair -v \
  -keystore genz-release.keystore \
  -alias genz-release \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass PASSWORD_YAKO \
  -keypass PASSWORD_YAKO \
  -dname "CN=GENZ WhatsApp, OU=GENZ, O=GENZ, L=Dar es Salaam, S=Dar es Salaam, C=TZ"
```

> Kwenye Windows, `keytool` iko ndani ya Java: `"C:\Program Files\Java\jdk-17\bin\keytool.exe"`

```bash
# 2. Unda keystore.properties (usiweke kwenye git!)
cat > keystore.properties <<EOF
storeFile=genz-release.keystore
storePassword=PASSWORD_YAKO
keyAlias=genz-release
keyPassword=PASSWORD_YAKO
EOF

# 3. Unda local.properties (inaelekeza kwenye Android SDK yako)
cat > local.properties <<EOF
sdk.dir=C\:\\Users\\dell\\AppData\\Local\\Android\\Sdk
EOF

# 4. Hifadhi nakala ya keystore mahali salama (Google Drive/USB)!
cp genz-release.keystore ~/Desktop/genz-release-keystore-BACKUP.keystore
```

---

## Sehemu ya 3: Kujenga APK

Kuanzia folder ya mradi (root):

```bash
cd frontend

# Bump version kwanza (1.1.11 → 1.1.12, versionCode +1)
npm run bump:apk patch

# Jenga APK (inajenga web app → cap sync → gradle → APK iliyotiwa sahihi)
npm run apk:build
```

Baada ya kumaliza, utaona:
- `frontend/public/genz-whatsapp.apk` — APK ya mwisho (ipakue na uweke kwenye simu)
- `frontend/public/version.json` — version na checksum (sha256) ya APK

**Jaribu APK kabla ya kutolewa** (kwenye emulator au simu halisi):
```bash
# Emulator (kama iko):
# 1. Anzisha emulator
"$LOCALAPPDATA/Android/Sdk/emulator/emulator" -avd genz-test

# 2. Sakinisha APK
"$LOCALAPPDATA/Android/Sdk/platform-tools/adb" install -r public/genz-whatsapp.apk

# 3. Fungua app
"$LOCALAPPDATA/Android/Sdk/platform-tools/adb" shell am start -n com.benivanny.genzwhatsapp/.MainActivity
```

---

## Sehemu ya 4: Kuweka APK kwenye Site (Hakuna GitHub tena)

**Download ya APK kupitia GitHub imeondolewa kabisa** — hakuna `downloadUrl`
kwenye `version.json`, hakuna GitHub link kwenye login/install pages, na
hakuna GitHub asset kwenye update banner. Watumiaji wanapakua APK **kutoka
site yenyewe tu**: `https://genz-whatsapp-1.onrender.com/genz-whatsapp.apk`
(kitufe cha "Download Android App" kinaelekeza hapo).

Mzunguko wa release ni:

```bash
cd frontend
npm run bump:apk patch   # versionCode +1, version.json mpya
npm run apk:build        # inajenga APK iliyotiwa sahihi → public/genz-whatsapp.apk
cd ..
git add -A
git commit -m "release: vX.Y.Z"
git push                  # Render ina-deploy APK + version.json moja kwa moja
```

Baada ya deploy, thibitisha:
1. `https://genz-whatsapp-1.onrender.com/genz-whatsapp.apk` inapakua APK mpya
2. `version.json` inaonyesha version mpya (hakuna `downloadUrl` tena)
3. Thibitisha checksum:
   ```bash
   certutil -hashfile genz-whatsapp.apk SHA256   # Windows
   # Linganisha na sha256 iliyo kwenye frontend/public/version.json
   ```

> CI scripts za GitHub release (`scripts/create-github-release.js`, `release.yml`,
> `release-engagement-check.js`) **zimefutwa kabisa** pamoja na `npm run
> release:github` — hakuna channel ya GitHub tena.

---

## Sehemu ya 5: Firebase FCM (Push Notifications za APK)

Push notifications kwenye **APK** (wakati app iko background/imauwa) zinahitaji
**Firebase Cloud Messaging (FCM)**. Bila hii, app bado inafanya kazi — inaruka
FCM kwa usalama (hakuna crash) — lakini hakuna push za background.

Mwongozo kamili uko kwenye `docs/FCM_SETUP_GUIDE.md`. Kwa kifupi:

1. Fungua **https://console.firebase.google.com** → Add project (jina: `genz-whatsapp`).
2. Project settings → **Add app → Android** → package name lazima iwe:
   ```
   com.benivanny.genzwhatsapp
   ```
3. Download **google-services.json** na uiweke hapa (gitignored — usiweke git):
   ```
   frontend/android/app/google-services.json
   ```
4. Jenga APK upya:
   ```bash
   cd frontend && npm run apk:build
   ```
5. Backend pia inahitaji service account (Project settings → Service accounts →
   Generate new private key) → weka `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
   `FIREBASE_PRIVATE_KEY`, `FIREBASE_PRIVATE_KEY_ID`, `FIREBASE_CLIENT_ID`
   kwenye Render Environment tab (au `backend/.env` local).

> ⚠️ Bila `google-services.json` app **haiaanguki tena** (tumerekebisha hii kwenye
> v1.1.11) — ina-loga tu "no Firebase project configured" na kuendelea.

---

## Sehemu ya 6: Kuweka Live kwenye Render (Deployment)

### Ukaguzi wa sasa (2026-08-14, jaribio la pili)

Tuligundua **Render haijibu**. Uchunguzi wa kina (DNS + TCP + TLS):
- DNS ✓ — `genz-whatsapp-1.onrender.com` inasuluhisha (Cloudflare origin, 216.24.57.7)
- TCP ✓ — port 443 inaunganishwa kwa urahisi
- **TLS ✗** — handshake inaunganisha lakini **server inarudisha byte 0**
  (curl: "Operation timed out with 0 bytes received")

TCP inafunguka lakini hakuna byte moja ya HTTP/TLS inayorudi → Render edge
proxy iko, lakini **origin service haijibu kabisa**. Hii ina maana service iko:
- **ime-suspended / deactivated** (free tier imelala), AU
- **iko kwenye crash loop** (server inapiga chafu mara kwa mara — kwa kawaida
  env variables hazipo kwenye Render), AU
- **service imefutika** kwenye Render (URL imebaki kutoka zamani)

### Hatua za kurekebisha (unahitaji kuingia Render)

> 👀 **Hujui wapi kubofya kwenye dashboard?** Angalia
> `docs/CHECKLIST_DASHBOARD_RENDER.md` — mwongozo wa hatua kwa hatua wa
> navigation (Events, Environment, Logs, Manual Deploy) kwa mtu asiyejua Render.

1. Fungua **https://dashboard.render.com** na uingie na akaunti yako.
2. Angalia kama service `genz-whatsapp` iko. Kama haipo → **unda upya** kwa
   kutumia `render.yaml` (New + → Blueprint → chagua repo yako).
3. Kama ipo → angalia **Events / Deploys** tab:
   - `Failed` → bofya deploy hiyo uone log za kwanini (kwa kawaida:
     `validateEnv` inalalamika env variable haipo).
   - `Live` → angalia **Environment** tab: hakikisha env zote zimewekwa
     (Sehemu ya 7 hapa chini).
4. Kama service imelala (free tier) → bofya **Manual Deploy → Deploy latest
   commit** au tembelea URL (inachukua ~1 dakika kuamka).
5. Baada ya redeploy, thibitisha:
   ```bash
   curl https://genz-whatsapp-1.onrender.com/api/health
   # Lazima uone: {"services":{"mongo":"connected","redis":"connected","mediaStorage":"cloudinary"}}
   ```

### Kukagua deploy kutoka terminal (unahitaji API key)

```bash
# Render → Account Settings → API Keys → unda key
export RENDER_API_KEY=rnd_xxx
export RENDER_SERVICE_ID=srv_xxx   # kwenye service URL: https://dashboard.render.com/web/srv-xxx

node scripts/render-deploy-status.js --limit 5
node scripts/render-deploy-verify.js https://genz-whatsapp-1.onrender.com
```

---

## Sehemu ya 7: Env Variables Muhimu za Render

Ukirekebisha Render, hakikisha hizi zote ziko kwenye Render **Environment** tab
(kama hazipo, server inapiga chafu kwenye startup):

```
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...          # Atlas yako
JWT_SECRET=...                          # ≥32 chars, random
JWT_REFRESH_SECRET=...                  # LAZIMA idifferent na JWT_SECRET
ADMIN_JWT_SECRET=...
ADMIN_BOOTSTRAP_TOKEN=...
BACKUP_ENCRYPTION_KEY=...
MESSAGE_ENCRYPTION_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
REDIS_URL=redis://...                   # (bado haijawashwa — inapendekezwa)
FRONTEND_URL=https://genz-whatsapp-1.onrender.com
PUBLIC_API_URL=https://genz-whatsapp-1.onrender.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...                           # (bado haijawekwa — email alerts hazitafanya kazi)
SMTP_PASS=...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:...
MANUAL_PAYMENT_RECEIVER_NAME=Jina Lako  # (bado haijawekwa — default inatumika!)
MANUAL_PAYMENT_RECEIVER_NUMBER=0XXXXXXX # (bado haijawekwa — default inatumika!)
ALLOW_MOCK_PAYMENTS=false
ALLOW_REAL_PAYMENT_PROVIDERS=true       # ukishasema unataka malipo ya kweli
```

> Kuna script ya kusaidia: `node scripts/setup-render-env.js` (inazalisha secrets
> na kuandika `backend/.env`). Mwongozo kamili: `RENDER_DEPLOY_GUIDE.md`.

---

## Sehemu ya 8: Troubleshooting

| Tatizo | Suluhisho |
|---|---|
| `npm run apk:build` inashindwa kwenye gradle | Hakikisha `local.properties` iko na SDK path ni sahihi; endesha `cd frontend/android && ./gradlew.bat clean` kisha jaribu tena |
| "Keystore was tampered with" | Keystore uliyotumia hailingani na `keystore.properties` — thibitisha password na alias |
| APK haiwezi kusasishwa kwenye simu | versionCode lazima iongezeke kila release — `npm run bump:apk patch` hufanya hivi |
| Render inatimeout | Angalia Sehemu ya 5 — kwa kawaida ni env vars au service imelala |
| Fingerprint haifanyi kazi kwenye APK | Hakikisha umeweka fingerprint kwenye simu/emulator (Settings → Security → Fingerprint); plugin ya biometric inaonekana kwenye `frontend/android/capacitor.settings.gradle` |
| App Lock haijifungia | Settings → App Lock → washa → chagua PIN au Fingerprint → weka backup PIN |

---

## Muhtasari wa Amri

```bash
# Jenga APK (mara baada ya keystore kuundwa mara ya kwanza)
cd frontend
npm run bump:apk patch
npm run apk:build

# Sakinisha kwenye emulator
"$LOCALAPPDATA/Android/Sdk/platform-tools/adb" install -r public/genz-whatsapp.apk

# Tolea watumiaji (site yenyewe inaserve APK — hakuna GitHub)
git add -A && git commit -m "feat(apk): vX.Y.Z"
git push

# Thibitisha Render iko live
curl https://genz-whatsapp-1.onrender.com/api/health
```
