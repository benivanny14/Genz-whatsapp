# Tangazo kwa Watumiaji — v1.1.13 (Update muhimu!)

Hati hii ina **draft kamili ya tangazo** la v1.1.13 pamoja na amri tayari za
kutuma kupitia admin API. **Hutakiwi kufanya chochote cha code** — unahitaji tu
admin credentials zako (username + password + TOTP) kwa ajili ya hatua ya mwisho.

> ⚠️ **Kabla ya kutuma:** endesha hatua ya 1 (`verify`) kwanza ili kuhakikisha
> production inaserve v1.1.13. Usitangaze update ambayo haijafika!

---

## 1. Thibitisha production (hiyo inaweza kufanywa sasa — hakuna creds zinazohitajika)

```bash
curl -s https://genz-whatsapp-1.onrender.com/version.json
# Inapaswa kuonyesha: "version": "1.1.13", "versionCode": 15
```

---

## 2. Maandishi ya tangazo (ndani ya app — chat ya "GENZ Support")

Tangazo hili linaenda kwa **kila mtumiaji** kama ujumbe wa chat kutoka kwa
"GENZ Support" (mfumo uliopo wa `sendSystemAnnouncement`). Maandishi yaliyo
hapo chini yako tayari — yameandikwa kwa Kiswahili cha watumiaji:

```
📢 UPDATE MUHIMU — GENZ v1.1.13 imefika!

Tumerekebisha mambo 3 makubwa kwenye APK:

1. ✅ Download ya APK imerekebishwa — tovuti ilikuwa ikitoa faili isiyo sahihi, sasa inatoa APK halisi.
2. ✅ App imerekebishwa — watu waliopakua v1.1.12 waliona ukurasa wa hitilafu ("Cannot GET /"), sasa app inafunguka vizuri.
3. ✅ Hakuna tena tangazo la "Update available" la uwongo unaposakinisha app mpya kwa mara ya kwanza.

Pamoja na hilo: kitufe cha back cha Android kinahusu sasa (chat → orodha → nje), icons mpya za WhatsApp green, na mfumo wa push umewekwa tayari.

⚠️ USIFUTE app kabla ya kusakinisha update! Uninstall inafuta mazungumzo yako. Sakinisha tu juu ya ile ya zamani (data inabaki).

👉 Pakua update: fungua app → utaona banner ya kijani "Update available — v1.1.13" → bonyeza Update.
Au pakua hapa: https://genz-whatsapp-1.onrender.com/genz-whatsapp.apk

Asante kwa kutumia GENZ! 💚
```

### Kidokezo cha push notification (kwa wale walio na app ikiwa wazi)

| Field | Thamani |
|---|---|
| title | `📢 GENZ v1.1.13 imefika — update muhimu!` |
| body | `Rekebisho 3 za APK zimetoka. Fungua app na ubonyeze Update (usifute app!)` |
| url | `/` |

---

## 3. Amri tayari za kutuma (zinahitaji admin credentials ZAKO)

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
  -d '{"content":"📢 UPDATE MUHIMU — GENZ v1.1.13 imefika! ... (maandishi ya sehemu ya 2)","segment":"all"}'
# → { "success": true, "message": "Announcement sent to N user(s)", "sent": N }
```

### 3d. (Hiari) Push notification

```bash
curl -s -X POST https://genz-whatsapp.onrender.com/api/admin/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"title":"📢 GENZ v1.1.13 imefika — update muhimu!","body":"Rekebisho 3 za APK zimetoka. Fungua app na ubonyeze Update (usifute app!)","segment":"all","url":"/"}'
```

---

## 4. Checklist kabla ya kutuma

- [ ] `version.json` ya production inasema **1.1.13** / code **15**
- [ ] Umejaribu download ya APK mwenyewe: `https://genz-whatsapp-1.onrender.com/genz-whatsapp.apk` inaweza kusakinishwa
- [ ] Umeridhika na maandishi (unaweza kuyarekebisha — ni maandishi tu)
- [ ] Uko tayari: tangazo litaenda kwa **watumiaji WOTE** na haliwezi kufutwa kwa kila mmoja
- [ ] (Hiari) Una `ADMIN_IP_ALLOWLIST` inayolingana na IP unayotumia (kama imewekwa)

---

*Hati hii inaweza kusasishwa kila release — badilisha tu version, versionCode na
maelezo ya mabadiliko kwenye sehemu ya 2.*
