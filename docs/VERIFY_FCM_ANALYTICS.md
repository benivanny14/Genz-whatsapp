# 📱 Kuthibitisha FCM Push + Firebase Analytics — Checklist

APK ya **v1.1.14 (code 18)** imejengwa na Firebase (FCM + Analytics + topic
`all` kwa kampeni za console) na imedeploy kwenye production. Hii ni checklist
ya kuthibitisha kila kitu kinafanya kazi baada ya kusakinisha kwenye simu halisi.

> Toleo la sasa la production: **code 18** (`version.json` → `7cca1712…`).
> Ikiwa simu yako inaonyesha code < 18, pakua APK mpya tena.

---

## Hatua 1 — Sakinisha APK mpya

1. Fungua kwenye simu yako: `https://genz-whatsapp-1.onrender.com/genz-whatsapp.apk`
   (au bofya **Download Android App** kwenye login page ya app).
2. Sakinisha juu ya APK ya zamani (data inabaki; signature ni ile ile).
3. Fungua app → utaona **banner ya "Update available — v1.1.14"** kama simu
   ilikuwa na toleo la zamani (versionCode < 18).

## Hatua 2 — Ingia na usajili wa token

1. Ingia na akaunti yako.
2. Token ya FCM inasajiliwa kiotomatiki kupitia `POST /api/notifications/fcm/register`
   (hakuna kitu cha kubofya — hutokea nyuma ya pazia).

**Kuthibitisha token ilisajiliwa (backend):**

```bash
# Kwenye backend — angalia logs za server baada ya login:
# [NotificationService] Registered FCM token for user <id>
```

Au angalia kwenye DB (MongoDB → `users` → user wako → `fcmTokens` inapaswa
kuwa na token moja).

## Hatua 3 — Jaribu push notification

1. Weka app **nyuma** (bonyeza kitufe cha Home — **usiife**).
2. Kutoka kwenye simu nyingine au kompyuta, tuma ujumbe kwa akaunti yako.
3. **Notification inapaswa kuonekana** juu ya skrini (kama WhatsApp halisi),
   hata kama app iko nyuma.

> 💡 Ikiwa app iko WAZI mbele, notification haionekani — hiyo ni kawaida;
> in-app toasts ndizo zinatumika huko.

## Hatua 4 — Angalia Analytics kwenye Firebase console

1. Fungua [console.firebase.google.com](https://console.firebase.google.com) →
   mradi **Genz whatsapp**.
2. Angalia **Analytics → Overview**:
   - **first_open** — inaonekana ~masaa 24-48 baada ya mtumiaji wa kwanza
     kufungua APK mpya.
   - **session_start** — huanza kuonekana baada ya dakika chache (inavyoweza
     kuchukua muda wa kusindika).
3. Ikiwa bado inaonyesha "No data", subiri hadi kesho — data ya Analytics
   haina realtime ya mara moja.

## Hatua 5 — Thibitisha backend inaweza kutuma push (hiari)

Backend inatumia FCM kupitia Firebase Admin SDK (service account imewekwa
kwenye `backend/.env`). Kuthibitisha:

```bash
cd backend && node -e "require('dotenv').config(); const f=require('./config/firebase'); console.log(f.isConfigured() ? 'Firebase iko configured ✓' : '✗');"
```

Ili backend ipeleke push kweli, weka `FIREBASE_*` kwenye **Render** pia
(angalia `render-env-ready.env`).

---

## Troubleshooting

| Tatizo | Suluhisho |
|---|---|
| Hakuna banner ya update | Angalia umeanzisha APK mpya (Settings → Help → Android app version → v1.1.14, code 18) |
| Push haifiki (app iko background) | 1) Angalia token ilisajiliwa (Hatua 2). 2) Angalia simu haina DND. 3) Backend lazima iwe na `FIREBASE_*` kwenye Render |
| App inacrash unapoingia | `google-services.json` imewekwa mbaya → ondoa, ipakue upya kutoka Firebase console (package: `com.benivanny.genzwhatsapp`) na ujenge upya |
| Analytics "No data" baada ya siku 2 | Thibitisha APK mpya (code 17) ndiyo imesakinishwa — APK ya zamani haina Analytics SDK |
| Token haisajiliwi | Angalia logs: `grep -i fcm` kwenye backend log. Thibitisha `/api/notifications/fcm/register` inarudi 200 |

---

## Baada ya kila kitu kupita

1. Weka `FIREBASE_*` kwenye Render (kutoka `render-env-ready.env`).
2. Weka GitHub secret `FIREBASE_GOOGLE_SERVICES_JSON_B64` (kutoka
   `github-secrets-ready.txt`) — ili CI iweze kujenga APK yenye FCM baadaye.
3. Update APK ya production inapotokea: bump version → jenga → commit → push
   (deploy.yml inapeleka kwenye Render kiotomatiki).
