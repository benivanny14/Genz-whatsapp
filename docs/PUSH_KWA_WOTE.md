# 📣 Kutuma Push kwa Watumiaji Wote — Firebase Console

Mwongozo huu unaeleza jinsi ya kutuma push notification kwa **watumiaji wote**
wa Genz Messenger kupitia **Firebase console → Cloud Messaging** — bila kuandika
code wala kutumia backend API.

> **Sharti:** watumiaji wanapaswa kuwa na APK ya **v1.1.14 (code 17)+** —
> ndiyo APK ya kwanza yenye FCM. APK za zamani hazina token.

---

## Njia A — Topic `all` (inapendekezwa, rahisi)

Kwa APK zilizojengwa baada ya update ya `capacitorBridge.js` (usajili wa topic
`all`), kila kifaa kinajiandikisha kwa topic ya **`all`** mara tu token
inaposajiliwa. Hivyo:

1. Fungua [console.firebase.google.com](https://console.firebase.google.com) →
   mradi **Genz whatsapp**.
2. Menyu ya kushoto → **Messaging** (Cloud Messaging) → **Create your first
   campaign** → **Notifications**.
3. Chini ya **Target** → chagua **Topics** → andika: `all`
   (utaona idadi ya wasajiliwa ikiwa imekwisha kujazwa).
4. Andika **Notification title** na **Text** (mf. "Genz Messenger — update mpya!").
5. **Schedule** → **Now** → **Review → Publish**.
6. Push itafika kwa KILA kifaa chenye APK mpya (hata kama app imefungwa).

> ⚠️ Ikiwa topic `all` inaonyesha 0 subscribers, watumiaji bado hawajaweka
> APK yenye usajili wa topic (angalia Njia B kwa sasa).

## Njia B — Upload ya tokens (inafanya kazi SASA hata bila topic)

1. Export tokens kutoka DB yako:
   ```bash
   MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/genz-whatsapp \
     node scripts/export-fcm-tokens.js fcm-tokens-export.csv
   ```
   (faili itajazwa na token moja kwa kila mstari).
2. Firebase console → **Messaging** → **Create campaign** → **Notifications**.
3. Katika **Target** → chagua **Token** (chaguo la "send to specific devices" /
   "upload token list") → weka / upload `fcm-tokens-export.csv`.
4. Andika title + text → **Send now**.
5. Push itafika kwa vifaa hivyo.

## Njia C — Test message kwa kifaa kimoja (jaribio la haraka)

1. Firebase console → **Messaging** → **Create campaign** → **Test on device**.
2. Unaweza kutuma kwa kifaa maalum kwa kuingiza token yake (token ya kifaa
   chako inaweza kupatikana kwenye backend logs baada ya login: `[NotificationService]
   Registered FCM token for user ...`, au kwenye DB → `users` → `fcmTokens`).

---

## Baada ya kutuma

- Push inaonekana **hata app ikiwa imefungwa** (background/dead) — hii ndiyo
  faida ya FCM vs web push.
- Ikiwa app iko wazi mbele, in-app toast ndiyo itaonekana (hii ni kawaida).
- **Kamwe usiweke `fcm-tokens-export.csv` kwenye git** — inaweza kutumika
  kutuma push; inaongezwa kwenye `.gitignore` (angalia hapa chini).

## Kwa nini usiweke tokens kwenye git?

FCM token inaruhusu kutuma notification kwa kifaa. Si siri kama nenosiri,
lakini ni vyema kuiweka mbali na git. Kama bado haijaongezwa, ongeza kwenye
`.gitignore`:

```
fcm-tokens-export.csv
```
