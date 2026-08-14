# 🚀 Mwongozo wa Kuweka Environment za Production kwenye Render

> ⚠️ **Hali ya Sasa (2026-08-12): `https://genz-whatsapp-1.onrender.com` haifikiki.**
> TCP inaungana lakini TLS handshake inaacha (timeout / connection refused) —
> dalili za kawaida za Render free-tier service ambayo imeshindwa kuwashwa
> (spin-down au crash loop).
>
> **Uchunguzi uliofanyika (2026-08-12):**
> - `backend/.env` ina `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` **tupu**, na
>   `MONGODB_URI=mongodb://localhost:27017/genz-whatsapp` (localhost!).
> - `backend/utils/validateEnv.js` ina **fail-closed kwenye production**: bila
>   Cloudinary (na bila HTTPS URLs, bila `JWT_REFRESH_SECRET` tofauti, nk.)
>   server **inakataa kuanza**. Render basi haifikii `/api/health` → service
>   inaonekana down.
> - Scripts `scripts/setup-render-env.js` na `scripts/export-render-env.js`
>   zinazotajwa hapa chini **hazipo kwenye repo** — mwongozo huu ni wa kumbukumbu;
>   weka env kwa mkono kwenye Render Dashboard.
>
> **Hatua za kurejesha (weka kwenye Render Dashboard → genz-whatsapp → Environment):**
> 1. `NODE_ENV=production` · `MONGODB_URI` = Atlas connection string (SI localhost!)
> 2. `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET`
>    (sharti — bila hizi server haianzi kwenye production)
> 3. `FRONTEND_URL` + `PUBLIC_API_URL` = `https://genz-whatsapp-1.onrender.com`
> 4. Thibitisha `JWT_REFRESH_SECRET` ni tofauti na `JWT_SECRET`; `ALLOW_MOCK_PAYMENTS=false`,
>    `ALLOW_ANONYMOUS_DEVICE_AUTH=false`, `RP_ID=genz-whatsapp-1.onrender.com`
> 5. **Manual Deploy → Deploy latest commit**, kisha thibitisha:
>    `curl https://genz-whatsapp-1.onrender.com/api/health` →
>    `{"mongo":"connected","mediaStorage":"cloudinary",...}`
>
> Kwa maelezo kamili ya kila key, soma jedwali la env hapa chini.

Mwongozo huu unakuongoza hatua kwa hatua kuweka env zote za GENZ WhatsApp
kwenye Render kwa mkono (manual) kwenye Render Dashboard.

**Kanuni za secrets (zilizokuwa zikifanywa na script ya zamani — sasa unafanya
wewe kwa mkono):**
- Tengeneza secrets zote (JWT, admin, encryption, VAPID) **mpya** — usirudie
  za development, na **hazijawahi kuwa placeholder** kwenye production
- **Haileti JWT_REFRESH_SECRET kutoka JWT_SECRET** (lazima ziwe tofauti —
  vinginevyo server haitakubali kuanza)
- Usiweke secrets kwenye git — zinakaa kwenye Render Dashboard pekee

> 📋 **Ili kufanya hivi haraka na kwa usahihi, tumia
> [`RENDER_RESTORE_CHECKLIST.md`](RENDER_RESTORE_CHECKLIST.md)** — ina jedwali
> kamili la keys, jinsi ya kuzalisha secrets, na hatua za uthibitisho.

---

## Hatua 1 — Fungua Render Dashboard

1. Fungua [dashboard.render.com](https://dashboard.render.com)
2. Chagua service **`genz-whatsapp`**
3. Fungua tab **Environment**

---

## Hatua 2 — Jaza Env Muhimu

Weka kila key (thamani halisi, si placeholder). Orodha kamili iko kwenye
[`RENDER_RESTORE_CHECKLIST.md`](RENDER_RESTORE_CHECKLIST.md) na kwenye jedwali
hapa chini. Angalau hivi ni sharti:

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
> `CLOUDINARY_API_SECRET` itakataliwa: server haitaanza (validateEnv fail-closed).
> Hii inazula data loss ya media kwenye Render kimyakimya. Pata credentials
> zako kwenye [Cloudinary Console](https://console.cloudinary.com/) → Dashboard.

---

## Hatua 3 — Weka Env kwa Mkono (Manual)

> ⚠️ Scripts `scripts/setup-render-env.js` na `scripts/export-render-env.js`
> zilizotajwa hapo awali **hazipo tena kwenye repo** — zimeondolewa. Env huwekwa
> kwa mkono moja kwa moja kwenye Render Dashboard.

1. **Fungua [dashboard.render.com](https://dashboard.render.com) → service `genz-whatsapp` → Environment**
2. **Weka kila key** iliyoorodheshwa kwenye jedwali hapa chini (muhimu zote + zilizopendekezwa)
3. **Thibitisha hakuna key yenye placeholder** (`change-me`, `your-...`, `example.com`) —
   validateEnv inakataa kuanza nazo
4. **Hakikisha** `MONGODB_URI` ni Atlas (sio `localhost`!), `JWT_REFRESH_SECRET` ni
   tofauti na `JWT_SECRET`, na `FRONTEND_URL`/`PUBLIC_API_URL` zina `https://`

> 📋 **Checklist kamili ya hatua kwa hatua (pamoja na thamani halisi za kuweka,
> jinsi ya kuzalisha secrets, na uthibitisho wa mwisho) iko kwenye
> [`RENDER_RESTORE_CHECKLIST.md`](RENDER_RESTORE_CHECKLIST.md).** Tumia hiyo kama
> mwongozo wa kuweka env zote.

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
Sentry (`SENTRY_DSN`),
Firebase FCM (`FIREBASE_*`), GIPHY (`GIPHY_API_KEY`), S3 backups
(`AWS_*`, `S3_BUCKET_NAME`), `ADMIN_IP_ALLOWLIST`, `LOG_LEVEL`, `MAX_UPLOAD_BYTES`,
`SMTP_*` (bado haitumiki kwenye code — OTP inaenda kupitia WhatsApp).

---

## Troubleshooting

| Tatizo | Suluhisho |
|---|---|
| `MONGODB_URI: REQUIRED but missing` | Weka kwenye `backend/.env` kisha endesha tena |
| `JWT_REFRESH_SECRET must differ` | Generate `JWT_REFRESH_SECRET` mpya (`openssl rand -hex 32`) — lazima iwe tofauti na `JWT_SECRET` |
| Server haianzi: "Environment validation failed" | Angalia logs za Render — kuna key yenye placeholder; weka thamani halisi |
| `mediaStorage: "local"` baada ya deploy | Cloudinary haijawekwa — weka `CLOUDINARY_*` na redeploy |
| Passkeys hazifanyi kazi | `RP_ID` lazima iwe domain halisi (bila `https://`), na lazima Render URL iwe HTTPS |
| OTP hazifiki | Angalia `WHATSAPP_OTP_ENABLED` na provider; kwa cloud-api thibitisha token + phone number ID |
| Web app inafunguka lakini `/api` inarudisha **502 ECONNREFUSED** | Frontend service (`genz-whatsapp-1`) ina-serve SPA kwa `vite preview`, na proxy yake ya `/api` inaelekea `http://localhost:5000` kwa default (hakuna backend ndani ya container yake). Weka env **`GENZ_BACKEND_TARGET`** = URL ya backend (e.g. `https://genz-whatsapp.onrender.com`) kwenye service hiyo na redeploy — au endesha workflow ya **"Render fix proxy"** (Actions tab) kwa `service_id` ya frontend. `vite preview` inasoma env hii kila startup, hakuna rebuild ya code inayohitajika.
| `[vite] http proxy error: /api/health` ECONNREFUSED kwenye logs za frontend | Sawa na juu — `GENZ_BACKEND_TARGET` haijaelekezwa kwa backend halisi. |
| APK inafanya kazi lakini web app haifanyi | APK ina-bake `VITE_API_URL=https://genz-whatsapp.onrender.com/api` kwenye build (`scripts/build-apk.js`) — inaenda moja kwa moja kwa backend. Web app inapita kwenye proxy ya frontend — angalia `GENZ_BACKEND_TARGET` (row hapo juu). |
| Services nyingi zinafanana (`genz-whatsapp`, `genz-whatsapp-1`, `genz-whatsapp-2`) | `genz-whatsapp` = backend API (inadeploy na GitHub workflow). `genz-whatsapp-1` = frontend web service (SPA + proxy ya `/api`). `genz-whatsapp-2` = static copy ya frontend (**ina-auto-deploy kutoka main** — `new_commit` trigger; ukibaki nyuma endesha **"Render fix proxy"** workflow na `deploy_only: true`). Kila moja inahitaji env zake: backend inahitaji `MONGODB_URI`/`JWT_SECRET` n.k.; frontend inahitaji `GENZ_BACKEND_TARGET`. |

---

## Nyaraka za Services (architecture ya sasa)

| Service | Aina | Inadeployje? | Inatumika kwa? |
|---|---|---|---|
| `genz-whatsapp` | Web (backend Express) | GitHub workflow `deploy.yml` (paths filter: `backend/**` + `render.yaml` + root package files pekee) | API ya app + `/api` endpoint zote |
| `genz-whatsapp-1` | Web (frontend `vite preview`) | Mkono tu (au workflow **"Render fix proxy"**) — proxy `/api` → `GENZ_BACKEND_TARGET` | Web app ya production (SPA + version.json + APK download) |
| `genz-whatsapp-2` | Static site | **Auto-deploy kutoka main** (`new_commit` trigger) | Static backup copy ya SPA + version.json |

> 💡 Kwa nini `genz-whatsapp-2` haihitaji mkono: static sites kwenye Render
> hupata `new_commit` trigger — kila push kwenye `main` inajenga upya build ya
> static site kiotomatiki. Ikiwa imebaki nyuma (e.g. build imeshindwa),
> endesha **"Render fix proxy"** workflow na `deploy_only: true` + service_id
> yake (inaweza kuonekana kupitia **"Render status"** workflow).

---

**Muhtasari:** baada ya env zote kuwekwa (ona [`RENDER_RESTORE_CHECKLIST.md`](RENDER_RESTORE_CHECKLIST.md))
na redeploy, angalia `/api/health` kwa `mediaStorage: cloudinary` + `redis: connected` —
hapo mfumo uko tayari kupokea watumiaji kwa kiwango kikubwa zaidi.
