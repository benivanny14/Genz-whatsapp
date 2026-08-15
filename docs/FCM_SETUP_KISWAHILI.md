# Kuwezesha Push Notifications (FCM) — Mwongozo wa Kiswahili

Mwongozo huu unaeleza hatua kwa hatua jinsi ya kutoa **`google-services.json`**
kutoka Firebase console na kuwezesha push notifications (FCM) kwenye APK ya
Genz Messenger. **Hii ndiyo kazi pekee iliyobaki** — code iko tayari kabisa
(imehakikiwa). Unahitaji tu dakika 10 na akaunti ya Google.

> ⚠️ **Inahitajika wewe, siwezi kuifanya mimi:** faili hii ina API keys za
> Firebase account yako — haiwezi kuzalishwa bila wewe kuingia kwenye
> [console.firebase.google.com](https://console.firebase.google.com).

---

## Ni nini kitatokea baada ya kufanya hivi?

- Kila mtumiaji atakapoingia kwenye app, kifaa chake kitajiandikisha kwenye
  Firebase na kupata token.
- Token hiyo inatumwa kwa backend (`POST /api/notifications/fcm/register`).
- Ujumbe mpya unapofika, push notification inafika **hata kama app imefungwa**
  (kama WhatsApp halisi).
- **Firebase Analytics pia inawashwa kiotomatiki** kwenye APK (SDK ya
  `firebase-analytics` imeongezwa kwenye `build.gradle`). Baada ya watumiaji
  kufungua APK mpya, dashboard ya Firebase → **Analytics** itaanza kuonyesha
  data (first_open, session_start, n.k.) bila code yoyote ya ziada.

---

## Hatua kwa hatua

### Hatua ya 1 — Fungua Firebase console

1. Fungua kivinjari → [console.firebase.google.com](https://console.firebase.google.com).
2. Ingia na akaunti ya Google yako.
3. Bofya **"Add project"** (au **"Create a project"**).
4. Jina la project: k.m. `genz-whatsapp`.
   - Google Analytics: **si lazima** — unaweza kuiondoa (off) ili iwe rahisi.
5. Bofya **Create Project** → subiri iwe tayari → **Continue**.

> Kama tayari una project ya GENZ kwenye Firebase, fungua tu hiyo (ruka hatua hii).

### Hatua ya 2 — Ongeza Android app

1. Ndani ya project yako, bofya icon ya ⚙️ (**Project settings**) juu-kulia.
2. Chini ya **"Your apps"** → bofya **"Add app"** (icon ya Android 🤖).
3. **Android package name** — andika KABISA hii (si nyingine!):
   ```
   com.benivanny.genzwhatsapp
   ```
   > Hili ndilo `applicationId` lililo kwenye `frontend/android/app/build.gradle`.
   > Likikosea hata herufi moja, FCM haitafanya kazi.
4. App nickname: k.m. `Genz Messenger APK` (ni jina la ndani tu).
5. Bofya **Register app**.

### Hatua ya 3 — Pakua google-services.json (kitu muhimu!)

1. Baada ya kuregister, utaona ukurasa wenye faili **`google-services.json`**.
2. Bofya **"Download google-services.json"** — faili itashuka kwenye Downloads yako.
3. (Hiari) Bofya **Next** mara 2-3 kwenye maagizo ya Firebase SDK —
   **usiongeze code yoyote**; plugin ya Capacitor tayari ina SDK. Unaweza
   kuacha wizard wakati wowote.
4. **Sakinisha faili kwenye project** — nakili `google-services.json` kwenye:
   ```
   frontend/android/app/google-services.json
   ```
   (folder ya `app`, SI `frontend/android/` — ndani ya `app/` moja kwa moja).

### Hatua ya 4 — Hakiki faili iko mahali sahihi

Fungua terminal kwenye project na endesha:

```bash
ls frontend/android/app/google-services.json
```

Unapaswa kuona faili. Fungua kwa notepad na uhakikishe ina:

```json
"package_name": "com.benivanny.genzwhatsapp"
```

> ⚠️ **Usiiweke kwenye git!** Faili hii iko kwenye `.gitignore` tayari —
> ina API keys za Firebase yako. Usiiweke kwenye GitHub au kuituma kwa mtu
> yeyote. (Ni salama kunakili kwenye folder ya `app/` ya kompyuta yako pekee.)

### Hatua ya 5 — Jenga APK mpya

```bash
cd frontend
npm run apk:build
```

- Script inaona `google-services.json` → inawasha `__GENZ_FCM_ENABLED__` →
  plugin ya `com.google.gms.google-services` ina-active kwenye build.gradle.
- APK mpya itaandikwa kwenye `frontend/public/genz-whatsapp.apk` (versionCode
  itaongezeka kiotomatiki).

### Hatua ya 6 — Thibitisha inafanya kazi

1. Sakinisha APK mpya kwenye simu (unaweza kuweka juu ya ile ya zamani —
   data inabaki).
2. Fungua app na ingia.
3. Bonyeza kitufe cha nyumbani (usiife app) — **usiifunge**.
4. Tuma ujumbe kwako mwenyewe (au kwa mtumiaji mwingine) kutoka kwenye simu
   nyingine / kompyuta.
5. **Notification inapaswa kuonekana** hata kama app iko nyuma (background).

---

## Ikiwa notification haifiki

| Tatizo | Suluhisho |
|---|---|
| `google-services.json` haipo kwenye `app/` | Rudia Hatua ya 3–4; hakiki jina la package ni `com.benivanny.genzwhatsapp` |
| APK haikujengwa upya baada ya kuweka faili | Endesha `npm run apk:build` tena — lazima faili iwepo KABLA ya build |
| App ina-crash unapoingia | Labda faili imewekwa kwenye folder mbaya (lazima `android/app/`); ondoa na uweke mahali sahihi |
| Push haifiki akiwa na app ikiwa wazi | Hiyo ni kawaida — in-app notifications zinafanya kazi tofauti; jaribu ukiwa background |
| Bado haifanyi kazi | Angalia logcat: `adb logcat -d \| grep -iE "fcm\|firebase\|push"` na uone kama token inaregister |

---

## Muhtasari wa faili zitakazoguswa

| Faili | Hali |
|---|---|
| `frontend/android/app/google-services.json` | **Mpya — wewe unaiweka** (gitignored) |
| `frontend/android/app/build.gradle` | Imeandaa tayari — `firebase-analytics` inaongezwa pamoja na FCM |
| `frontend/vite.config.js` | Imeandaa tayari — inagundua faili kiotomatiki |
| `frontend/src/services/capacitorBridge.js` | Imeandaa tayari — inasajili token kiotomatiki |
| `backend/routes/notificationRoutes.js` | Imeandaa tayari — `POST /fcm/register` iko |
| `backend/.env` (FIREBASE_* keys) | **Mpya — unahitaji** (kwa SMS/backend push; si lazima kwa APK) |

> **Kumbuka:** Kwa APK tu, hatua ya 1–6 inatosha. FIREBASE_* za backend
> (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`)
> zinahitajika tu kama unataka backend itume push moja kwa moja (badala ya
> kutumia web push). Mwongozo kamili wa kiufundi: `docs/FCM_SETUP_GUIDE.md`.
