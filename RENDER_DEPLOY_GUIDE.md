# 🚀 Mwongozo wa Kuweka Environment za Production kwenye Render

Mwongozo huu unakuongoza hatua kwa hatua kuweka env zote za GENZ WhatsApp
kwenye Render kwa kutumia script ya `scripts/setup-render-env.js`.

Script inafanya yafuatayo **kwa ajili yako**:
- Inageneretea secrets zote zilizokosekana (JWT, admin, encryption) — **hazijawahi
  kuwa placeholder** kwenye production
- Inageneretea **VAPID keys** (push notifications) kwa format sahihi ya web-push
- Inakataa kusukuma maadili ya placeholder (change-me, your-..., example.com)
- **Haileti JWT_REFRESH_SECRET kutoka JWT_SECRET** (lazima ziwe tofauti — vinginevyo
  server haitakubali kuanza)
- Inakuhifadhia secrets zilizogeneretea kwenye `backend/.env` (sio kwenye screen)

---

## Hatua 1 — Pata Render API Key na Service ID

1. Fungua [dashboard.render.com](https://dashboard.render.com)
2. Chini kushoto: **Account Settings → API Keys → Create API Key**
3. Nakili key (inaanza na `rnd_...`)
4. Pata **Service ID** yako:
   - Njia A: kutoka URL ya service yako — `dashboard.render.com/web/srv-XXXXX/...`
     (sehemu ya `srv-XXXXX`)
   - Njia B: acha script iitafute kwa jina (`--service-name genz-whatsapp`)

---

## Hatua 2 — Jaza Mambo Muhimu kwenye `backend/.env`

Kabla ya kuendesha script, weka angalau hivi kwenye `backend/.env` (mengine
yote script itajaza yenyewe):

```env
# MUHIMU (bila hii server haitaanza)
MONGODB_URI=mongodb+srv://USER:PASS@cluster0.mongodb.net/genz-whatsapp?retryWrites=true&w=majority

# MEDIA — LAZIMA (server HAITAANZA bila hii!)
# Cloudinary ni sharti kwa production: bila hiyo media inahifadhiwa kwenye
# disk ya ephemeral ya Render na inafutika kimya kimya kila redeploy.
# backend/utils/validateEnv.js ina-fail closed: NODE_ENV=production bila
# Cloudinary → server inakataa kuanza (error wazi, haifiki runtime).
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# MALIPO (bila hii user atalipia namba ya default hardcoded)
MANUAL_PAYMENT_RECEIVER_NAME=Jina Lako Rasmi
MANUAL_PAYMENT_RECEIVER_NUMBER=0XXXXXXXXX

# OTP kupitia WhatsApp Business Cloud API (inapendekezwa badala ya whatsapp-web)
WHATSAPP_CLOUD_API_ACCESS_TOKEN=EAAG...
WHATSAPP_CLOUD_API_PHONE_NUMBER_ID=1234567890

# Redis (hiari lakini inapendekezwa kwa scaling)
REDIS_URL=redis://default:pass@your-redis.upstash.io:6379

# Passkeys — domain halisi ya Render yako (muhimu WebAuthn ifanye kazi)
RP_ID=genz-whatsapp-1.onrender.com
```

> ⚠️ **Usiweke namba yako ya mobile money kwenye code au kwenye git** —
> weka kwenye `.env` pekee (ambayo iko kwenye `.gitignore`).

> 🔒 **Cloudinary ni lazima, si hiari.** Kuanzia sasa, deployment yoyote ya
> production **bila** `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_API_KEY` +
> `CLOUDINARY_API_SECRET` itakataliwa: server haitaanza (validateEnv fail-closed)
> na script ya `setup-render-env.js` itatoa error. Hii inazula data loss ya
> media kwenye Render kimyakimya. Pata credentials zako kwenye
> [Cloudinary Console](https://console.cloudinary.com/) → Dashboard.

---

## Hatua 3 — Endesha Script

### Kwanza angalia mpango (dry-run) — hakuna kitu kitakachobadilika:

```bash
set RENDER_API_KEY=rnd_xxxxxxxxxxxxxxxx
node scripts/setup-render-env.js --service-id srv-xxxxxxx --dry-run
```

Utaona:
- Ni env ngapi zitakazowekwa (kawaida ~44+)
- Ni secrets zipi zitatengenezwa (`+ JWT_SECRET`, `+ VAPID_PUBLIC_KEY` ...)
- Warnings (Cloudinary haipo, nk.) na Errors (MONGODB_URI haipo, nk.)

### Kisha endesha halisi:

```bash
node scripts/setup-render-env.js --service-id srv-xxxxxxx
```

Matokeo:
- Kila key itaonekana na `✓`
- Secrets zilizogeneretea zitahifadhiwa kwenye `backend/.env` — **hifadhi faili
  hii salama, usiiweke kwenye git**
- Unapata mwongozo wa redeploy

### Njia mbadala (kama unapendelea kuingiza kwa mkono kwenye dashboard):

```bash
node scripts/export-render-env.js
# → inaunda scripts/render-env-export.txt
# Fungua Render → genz-whatsapp → Environment → Paste kila line
# Futa render-env-export.txt baada ya kuingiza (ina secrets!)
```

---

## Hatua 4 — Redeploy na Uthibitishe

1. Render Dashboard → genz-whatsapp → **Manual Deploy → Deploy latest commit**
   (au push kwenye GitHub kama CI iko connected)
2. Subiri deployment ikamilike (5-10 min)
3. Thibitisha afya ya mfumo:

```bash
curl https://genz-whatsapp-1.onrender.com/api/health
```

**Unahitaji kuona:**
```json
{"success":true,"status":"ok","services":{"mongo":"connected","redis":"connected","mediaStorage":"cloudinary"}}
```

- `mongo: connected` → DB iko sawa
- `mediaStorage: cloudinary` → media haitapotea tena kwenye redeploy ✅
- `redis: connected` → sockets zinaweza kusambaa kwenye instances nyingi

4. Jaribu kwa mkono: register user mpya → OTP → tuma ujumbe → pakia picha →
   premium (malipo manual) → passkey.

---

## Jedwali la Env zote

### REQUIRED (server inakataa kuanza bila hizi — secrets zinajazwa otomatiki)
| Key | Maana |
|---|---|
| `MONGODB_URI` | Atlas connection string (**unaiweka wewe**) |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Access + refresh secrets (tofauti! zinageneretea) |
| `ADMIN_JWT_SECRET` / `ADMIN_BOOTSTRAP_TOKEN` | Admin secrets (zinageneretea) |
| `BACKUP_ENCRYPTION_KEY` / `MESSAGE_ENCRYPTION_SECRET` | Encryption keys (zinageneretea) |
| `FRONTEND_URL` / `PUBLIC_API_URL` | Origins za CORS/CSRF (default = Render URL) |
| `NODE_ENV`, `PORT`, `JWT_EXPIRE` | Defaults sahihi |

### RECOMMENDED (bila hizi mfumo unafanya kazi lakini kwa hatari)
| Key | Maana |
|---|---|
| `CLOUDINARY_*` | Media storage (bila hizi media itapotea!) |
| `VAPID_PUBLIC/PRIVATE_KEY`, `VAPID_SUBJECT` | Push notifications (zinageneretea) |
| `REDIS_URL` | Sockets za distributed + presence |
| `MANUAL_PAYMENT_RECEIVER_*` | Namba ya kukusanyia malipo |
| `PHONE_VERIFICATION_REQUIRED` | OTP gate (default `true`) |
| `WHATSAPP_OTP_PROVIDER` | `cloud-api` inapendekezwa (si `whatsapp-web`) |
| `WHATSAPP_CLOUD_API_*` | Meta Cloud API token + phone number ID |
| `RP_ID` | Domain kwa passkeys (WebAuthn) |

### OPTIONAL (feature-specific)
Sentry (`SENTRY_DSN`), TURN/Metered (`METERED_TURN_*`, `TURN_*`, `ICE_*`),
Firebase FCM (`FIREBASE_*`), GIPHY (`GIPHY_API_KEY`), S3 backups
(`AWS_*`, `S3_BUCKET_NAME`), `ADMIN_IP_ALLOWLIST`, `LOG_LEVEL`, `MAX_UPLOAD_BYTES`,
`SMTP_*` (bado haitumiki kwenye code — OTP inaenda kupitia WhatsApp).

---

## Troubleshooting

| Tatizo | Suluhisho |
|---|---|
| `MONGODB_URI: REQUIRED but missing` | Weka kwenye `backend/.env` kisha endesha tena |
| `JWT_REFRESH_SECRET must differ` | Ondoa `JWT_REFRESH_SECRET` kwenye .env yako — script itageneretea mpya |
| Server haianzi: "Environment validation failed" | Angalia logs za Render — kuna key yenye placeholder; weka thamani halisi |
| `mediaStorage: "local"` baada ya deploy | Cloudinary haijawekwa — weka `CLOUDINARY_*` na redeploy |
| Passkeys hazifanyi kazi | `RP_ID` lazima iwe domain halisi (bila `https://`), na lazima Render URL iwe HTTPS |
| OTP hazifiki | Angalia `WHATSAPP_OTP_ENABLED` na provider; kwa cloud-api thibitisha token + phone number ID |

---

**Muhtasari:** baada ya script kukamilika na redeploy, angalia `/api/health`
kwa `mediaStorage: cloudinary` + `redis: connected` — hapo mfumo uko tayari
kupokea watumiaji kwa kiwango kikubwa zaidi.
