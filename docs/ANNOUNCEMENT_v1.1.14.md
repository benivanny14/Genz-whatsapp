# Tangazo kwa Watumiaji — v1.1.14 (Update muhimu!)

Hati hii ina **draft kamili ya tangazo** la v1.1.14 pamoja na amri tayari za
kutuma kupitia admin API. **Hutakiwi kufanya chochote cha code** — unahitaji tu
admin credentials zako (username + password + TOTP) kwa ajili ya hatua ya mwisho.

> ⚠️ **Kabla ya kutuma:** endesha hatua ya 1 (`verify`) kwanza ili kuhakikisha
> production inaserve v1.1.14. Usitangaze update ambayo haijafika!

---

## 1. Thibitisha production (hiyo inaweza kufanyika sasa — hakuna creds zinazohitajika)

```bash
curl -s https://genz-whatsapp-1.onrender.com/version.json
# Inapaswa kuonyesha: "version": "1.1.14", "versionCode": 16
```

---

## 2. Maandishi ya tangazo (ndani ya app — chat ya "GENZ Support")

Tangazo hili linaenda kwa **kila mtumiaji** kama ujumbe wa chat kutoka kwa
"GENZ Support" (mfumo uliopo wa `sendSystemAnnouncement`). Maandishi yaliyo
hapo chini yako tayari — yameandikwa kwa Kiswahili cha watumiaji:

```
📢 UPDATE KUBWA — GENZ v1.1.14 imefika!

Tumefanya mabadiliko makubwa mawili:

1. 🚫 VOICE NA VIDEO CALLS ZIMEONDOLWA — GENZ sasa ni app ya pure messaging
   (kama WhatsApp ya zamani kabla ya calls). Ujumbe, picha, video, files,
   voice notes na status — zote zimebaki na zinafanya kazi kama kawaida.

2. ⚡ APP INAFUNGUKA MARA MOJA — tangu v1.1.14 APK ina-bundle app nzima
   ndani yake, hivyo haitegemei mtandao tena kufunguka. Hata bila internet,
   app inafunguka na unaweza kuona chats zako (kutuma ujumbe bado kunahitaji
   mtandao).

⚠️ USIFUTE app kabla ya kusakinisha update! Uninstall inafuta mazungumzo
yako. Sakinisha tu juu ya ile ya zamani (data inabaki — v1.1.13 → v1.1.14).

👉 Pakua update: fungua app → utaona banner ya kijani "Update available —
v1.1.14" → bonyeza Update.
Au pakua hapa: https://genz-whatsapp-1.onrender.com/genz-whatsapp.apk

Asante kwa kutumia GENZ! 💚
```

### Kidokezo cha push notification (kwa wale walio na app ikiwa wazi)

| Field | Thamani |
|---|---|
| title | `📢 GENZ v1.1.14 imefika — calls zimeondolewa, app inafunguka offline!` |
| body | `Pure messaging sasa. Fungua app na ubonyeze Update (usifute app!)` |
| url | `/` |

---

## 3. Amri tayari za kutuma (zinahitaji admin credentials ZAKO)

### Njia rahisi (script ya amri moja — inafanya hatua 3 kiotomatiki)

```bash
ADMIN_USERNAME=<username> ADMIN_PASSWORD=<password> TOTP_CODE=<6-digit> \
  npm run announce:dry      # kwanza: test ya creds bila kutuma (inachapisha maandishi)

ADMIN_USERNAME=<username> ADMIN_PASSWORD=<password> TOTP_CODE=<6-digit> \
  npm run announce          # kisha: tuma kwa watumiaji wote

# Inaweza kuverify production kwanza (version.json = 1.1.14):
ADMIN_USERNAME=<username> ADMIN_PASSWORD=<password> TOTP_CODE=<6-digit> \
  node scripts/send-announcement.js --verify
```

Script inasoma `ANNOUNCEMENT_CONTENT` / `ANNOUNCEMENT_SEGMENT` / `API_BASE` kama
env vars (defaults: maandishi ya sehemu ya 2, segment `all`, backend ya
production). Exit 1 ikiwa creds si sahihi au production haiserve v1.1.14 bado.

### Njia ya mkono (curl — hatua kwa hatua)

Mchakato ni hatua 3: login → 2FA → tangazo. Badilisha tu mabano `<...>`.

### 3a. Login (hatua 1) — unapata `preAuthToken`

```bash
curl -s -X POST https://genz-whatsapp.onrender.com/api/system-gateway-x9k/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"<ADMIN_USERNAME>","password":"<ADMIN_PASSWORD>"}'
# → { "success": true, "requiresTwoFactor": true, "preAuthToken": "<TOKEN>" }
```

### 3b. 2FA (hatua 2) — unapata `accessToken` (code kutoka Google Authenticator yako)

```bash
curl -s -X POST https://genz-whatsapp.onrender.com/api/system-gateway-x9k/auth/verify-2fa \
  -H "Content-Type: application/json" \
  -d '{"preAuthToken":"<PRE_AUTH_TOKEN>","code":"<TOTP_6_DIGITS>"}'
# → { "success": true, "accessToken": "<ACCESS_TOKEN>", "refreshToken": "..." }
```

### 3c. Tuma tangazo la ndani ya app (kwa watumiaji wote)

```bash
curl -s -X POST https://genz-whatsapp.onrender.com/api/admin/broadcasts/announce \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"content":"📢 UPDATE KUBWA — GENZ v1.1.14 imefika! ... (maandishi ya sehemu ya 2)","segment":"all"}'
# → { "success": true, "message": "Announcement sent to N user(s)", "sent": N }
```

### 3d. (Hiari) Push notification

```bash
curl -s -X POST https://genz-whatsapp.onrender.com/api/admin/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"title":"📢 GENZ v1.1.14 imefika — calls zimeondolewa, app inafunguka offline!","body":"Pure messaging sasa. Fungua app na ubonyeze Update (usifute app!)","segment":"all","url":"/"}'
```

---

## 4. Checklist kabla ya kutuma

- [ ] `version.json` ya production inasema **1.1.14** / code **16**
- [ ] Umejaribu download ya APK mwenyewe: `https://genz-whatsapp-1.onrender.com/genz-whatsapp.apk` inaweza kusakinishwa
- [ ] Umeridhika na maandishi (unaweza kuyarekebisha — ni maandishi tu)
- [ ] Uko tayari: tangazo litaenda kwa **watumiaji WOTE** na haliwezi kufutwa kwa kila mmoja
- [ ] (Hiari) Una `ADMIN_IP_ALLOWLIST` inayolingana na IP unayotumia (kama imewekwa)

---

*Hati hii inaweza kusasishwa kila release — badilisha tu version, versionCode na
maelezo ya mabadiliko kwenye sehemu ya 2.*
