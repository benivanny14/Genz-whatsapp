# 📱 Mwongozo wa WhatsApp OTP (Cloud API) — Hatua kwa Hatua

Mwongozo huu unakuongoza kuwasha **OTP (phone verification) kwa njia ya
WhatsApp** kwenye Genz Messenger, kwa kutumia **Meta WhatsApp Business Cloud
API** (`WHATSAPP_OTP_PROVIDER=cloud-api`).

> ✅ Ni provider inayopendekezwa kwa production — rasmi ya Meta, hakuna
> hatari ya namba kupigwa ban (tofauti na `whatsapp-web` ambayo inatumia
> protocol ya consumer na inaweza kupigwa ban kwa OTP nyingi).

---

## Kwanza: OTP flow inafanyaje kazi kwenye repo hii?

| Sehemu | Faili | Kazi |
|---|---|---|
| Kuzalisha OTP (6-digit, TTL 5 min, max 5 attempts) | `backend/services/otpStore.js` | In-memory Map |
| Kuchagua provider (whatsapp-web / cloud-api) | `backend/services/otpDeliveryService.js` | `WHATSAPP_OTP_PROVIDER` |
| Kutuma ujumbe kupitia Meta | `backend/services/whatsappCloudApiService.js` | Graph API `v21.0` |
| Endpoints | `backend/controllers/whatsappOtpController.js` | `/api/auth/send-otp`, `/api/auth/verify-otp` |
| Gate ya usajili | `backend/controllers/authController.js` | `PHONE_VERIFICATION_REQUIRED` |

Pointi muhimu za code:

- OTP hutumwa **tu** ikiwa `WHATSAPP_OTP_ENABLED=true`.
- Kama ujumbe unashindikana, **usajili hauvunjiki** — OTP inabaki kwenye
  store, hitilafu inaandikwa kwenye log, na kwenye development OTP inaonekana
  kwenye response kama `devOtp` (kwa ajili ya kupima).
- Namba inasawazishwa hivi: `0712345678` → `255712345678` (huondoa `0` ya
  mwanzo, anaweka `WHATSAPP_OTP_COUNTRY_CODE`, default `255`).
- `PHONE_VERIFICATION_REQUIRED` default ni **true** (inageuka false tu kama
  umeweka `PHONE_VERIFICATION_REQUIRED=false`). Kwenye Render env ya sasa ni
  `false` — hapo OTP haitumiki kabisa.
- `validateEnv.js` ina **fail-closed**: production + `PHONE_VERIFICATION_REQUIRED=true`
  + bila OTP channel (`WHATSAPP_OTP_ENABLED=true` na creds) → **server haitaanza**.

---

## Hatua 1 — Tengeneza Meta developer app + WhatsApp Cloud API

1. Fungua [developers.facebook.com](https://developers.facebook.com) →
   login kwa akaunti ya Facebook.
2. **My Apps → Create App** → chagua aina **Business** → jaza jina
   (e.g. `Genz Messenger`) → Create.
3. Ndani ya app, ongeza **WhatsApp** product (Add Products → WhatsApp).
4. Fungua **WhatsApp → API Setup**:
   - Utaona **test number** ya Meta (e.g. `15551234567`) — namba ya mtumaji.
   - **Phone number ID** (namba ndefu ya ID, si namba ya simu).
   - **Temporary access token** (inaisha baada ya **saa 24**).
5. Kwenye **API Setup → "To" recipients**, ongeza namba za simu za kupima
   (**hadi 5 tu** kwenye test mode) — bila hizi, ujumbe unashindikana kwa
   error code **131047**.

> 🔐 **Kwa production** (baada ya kujaribu): tengeneza **Permanent token**:
> Settings → **System Users** → Add → select app → permissions
> `whatsapp_business_messaging` + `whatsapp_business_management` → Generate
> token → nakili (hauonekani tena!). Weka huu token kwenye env badala ya
> temporary.

## Hatua 1b — Sakinisha Webhook (inahitajika ili kupita "Configure Webhooks")

Kwenye dashboard ya Meta app → **WhatsApp → Configuration**, ukifika kwenye
hatua **Configure Webhooks**, jaza hivi:

- **Callback URL**:
  `https://genz-whatsapp.onrender.com/webhook/whatsapp`
  ⚠️ **Tumia `genz-whatsapp` (backend/API host) — SI `genz-whatsapp-1`**,
  kwa sababu `genz-whatsapp-1` ni frontend/UI host inayoproxy `/api` pekee;
  endpoint ya webhook iko kwenye backend service.
- **Verify token**: andika **siri yoyote** unayoitengeneza mwenyewe (e.g.
  `genz_webhook_verify_2026`) — token ileile lazima iwe kwenye env
  `WHATSAPP_WEBHOOK_VERIFY_TOKEN` ya server.
- Bonyeza **Verify and save**. Meta itatumia GET kwenye callback URL; ikiwa
  token inalingana, endpoint itarudisha `hub.challenge` na Meta itakubali.

> ✅ Endpoint hii ipo tayari kwenye repo: `backend/routes/whatsapp-webhook.js`
> (mounted kwenye `/webhook/whatsapp`). Inafanya verification handshake na
> inaloga events (messages / status updates) — hakuna haja ya kuandika code
> yoyote mpya, weka tu env na u-deploy.

## Hatua 2 — Weka environment variables

Weka kwenye `backend/.env` (na kisha kwenye **Render Dashboard →
genz-whatsapp → Environment**):

```env
# ── WhatsApp OTP (Cloud API) ──
WHATSAPP_OTP_ENABLED=true
WHATSAPP_OTP_PROVIDER=cloud-api
WHATSAPP_OTP_COUNTRY_CODE=255
WHATSAPP_OTP_TTL_MINUTES=5
WHATSAPP_CLOUD_API_ACCESS_TOKEN=EAAG...   # token KAMILI (sio kukatwa)
WHATSAPP_CLOUD_API_PHONE_NUMBER_ID=1234567890  # ID halisi ya Meta
WHATSAPP_CLOUD_API_VERSION=v21.0
WHATSAPP_WEBHOOK_VERIFY_TOKEN=genz_webhook_verify_2026  # siri yako mwenyewe (ilingane na Meta dashboard)

# ── Phone verification gate ──
PHONE_VERIFICATION_REQUIRED=true
```

Kumbuka:

- `WHATSAPP_CLOUD_API_ACCESS_TOKEN` inaanza kwa `EAAG...` (Meta token) —
  weka **token nzima**, si `EAAG...` iliyokatwa.
- `WHATSAPP_CLOUD_API_PHONE_NUMBER_ID` ni **ID ya namba ya mtumaji** (namba
  ndefu ya Meta), si namba ya simu yako.
- Kama unatumia `PHONE_VERIFICATION_REQUIRED=true` na
  `WHATSAPP_OTP_ENABLED` bado ni `false` → server ya production **haikubali
  kuanza** (validateEnv fail-closed). Zima gate au washa OTP kwanza.

## Hatua 3 — Anzisha backend na upime OTP

```bash
cd backend
npm run dev
```

Kisha jaribu kuomba OTP (kwenye terminal nyingine):

```bash
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"2557XXXXXXXX"}'
```

- ✅ `{"success":true,"message":"OTP sent via WhatsApp",...}` → ujumbe
  umefika kwenye WhatsApp ya namba hiyo.
- 🧪 Kwenye **development** (`NODE_ENV!=production`) response pia ina
  `devOtp` — unaweza kuthibitisha OTP bila kuangalia WhatsApp.
- ❌ Kama kuna hitilafu, utaona error code (angalia jedwali hapa chini).

Thibitisha OTP:

```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"2557XXXXXXXX","otp":"123456"}'
```

## Hatua 4 — Jaribu usajili kamili (end-to-end)

1. **Register** user mpya kwenye app (namba ya simu halisi, format yoyote:
   `0712345678`, `255712345678`, au `+255 712 345 678`).
2. Frontend itampeleka user kwenye **VerifyPhone** page
   (`frontend/src/pages/VerifyPhone.jsx`).
3. User anaweka OTP aliyopokea kwenye WhatsApp → `POST /api/auth/verify-phone-otp`
   → `phoneVerified` inakuwa `true`.
4. Kama user hana namba inayofanya kazi, kuna `POST /api/auth/resend-phone-otp`.

## Hatua 5 — Errors za kawaida (cloud-api)

| Error code | Maana | Suluhisho |
|---|---|---|
| `190` | Token si sahihi / imeisha | Tengeneza token mpya (temp inaisha saa 24; tumia permanent token ya System User) |
| `131047` | Namba haipo kwenye test-mode whitelist / haifikiki | Ongeza namba kwenye "To" recipients (API Setup) |
| `131030` | Namba ya mpokeaji haijasajiliwa kwenye WhatsApp | Thibitisha namba iko na WhatsApp |
| `100` | Phone number ID si sahihi | Nakili PHONE_NUMBER_ID sahihi kutoka API Setup |
| `131042` / `131056` | Business/app haijasajiliwa kwa WhatsApp API | Angalia app settings na WhatsApp product |
| `10` | Token haina permission | System User token inahitaji `whatsapp_business_messaging` |

Angalia logs za backend: kila jaribio linaandika
`[OTPDelivery] ... OTP sent via Cloud API to 2557XXXXXXXX` au
`[OTPDelivery] ... could NOT be sent`.

## Hatua 6 — Production (kabla ya watumiaji wengi)

1. **Permanent token** ya System User (angalia Hatua 1).
2. **App Review**: WhatsApp Business → Application Review → submit
   `whatsapp_business_messaging` — bila hii unaweza kutuma kwa **namba 5
   pekee** (test mode).
3. **Billing**: Meta inatoa **1000 service conversations bure kwa mwezi**,
   kisha ujumbe wa OTP (utility/service) unagharimu kwa kila ujumbe.
4. `otpStore` ni **in-memory** — kama una backend instances nyingi, badilisha
   kuwa Redis/MongoDB kwa kutumia interface ileile
   (`generateOtp`/`storeOtp`/`verifyOtp`/`clearOtp`).
5. Baada ya kuthibitisha, weka `WHATSAPP_OTP_RETURN_IN_RESPONSE=false` (default)
   ili `devOtp` isionekane kwenye production.

---

**Muhtasari wa haraka:** Meta app → token + phone number ID → weka env
(`WHATSAPP_OTP_ENABLED=true`, `WHATSAPP_OTP_PROVIDER=cloud-api`, creds) →
`PHONE_VERIFICATION_REQUIRED=true` → jaribu `/api/auth/send-otp` → jaribu
usajili → production: permanent token + app review.
