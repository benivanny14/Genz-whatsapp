# ✅ Checklist ya Kurejesha GENZ kwenye Render

**Tarehe:** 2026-08-12 — `https://genz-whatsapp-1.onrender.com` haifikiki (TLS handshake inaacha /
connection refused). Hii ni checklist ya hatua kwa hatua ya kuirejesha.

**Chanzo cha tatizo:** Server ya production ina **fail-closed** — `backend/utils/validateEnv.js`
inakataa kuanza ikiwa env muhimu hazipo au si sahihi. Uchunguzi ulionyesha `CLOUDINARY_*` tupu na
`MONGODB_URI=mongodb://localhost:27017/...` (localhost!) kwenye `backend/.env`. Ikiwa hizi ziliwekwa
kwenye Render, server haianzi kabisa → Render haiwezi kupitisha `/api/health` → service iko down.

---

## Hatua 1 — Nenda kwenye Render Dashboard

1. Fungua [dashboard.render.com](https://dashboard.render.com)
2. Chagua service **`genz-whatsapp`**
3. Fungua tab **Environment** (kushoto)

## Hatua 2 — Weka env zifuatazo (ZOTE ni sharti kwenye production)

| Key | Thamani | Maelezo |
|---|---|---|
| `NODE_ENV` | `production` | Iko tayari kwenye render.yaml — hakikisha haijabadilishwa |
| `PORT` | `5000` | Port ya Render |
| `MONGODB_URI` | `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/genz-whatsapp?retryWrites=true&w=majority` | **Atlas connection string** (sio localhost!). Pata kwenye [MongoDB Atlas](https://cloud.mongodb.com) → Database → Connect → Drivers. `USER:PASS` = database user wako |
| `JWT_SECRET` | `openssl rand -hex 32` | Sekreti mpya, ≥32 chars |
| `JWT_EXPIRE` | `7d` | |
| `JWT_REFRESH_SECRET` | `openssl rand -hex 32` | **Lazima iwe tofauti na JWT_SECRET** — vinginevyo server haianzi |
| `ADMIN_JWT_SECRET` | `openssl rand -hex 32` | Sekreti ya admin panel |
| `ADMIN_BOOTSTRAP_TOKEN` | `openssl rand -hex 32` | Token ya kuunda akaunti ya kwanza ya admin (AdminOwner) |
| `BACKUP_ENCRYPTION_KEY` | `openssl rand -hex 32` | Ufunguo wa chat backup |
| `MESSAGE_ENCRYPTION_SECRET` | `openssl rand -hex 32` | Ufunguo wa encryption (≥32 chars) |
| `FRONTEND_URL` | `https://genz-whatsapp-1.onrender.com` | **HTTPS ni sharti** kwenye production |
| `PUBLIC_API_URL` | `https://genz-whatsapp-1.onrender.com` | **HTTPS ni sharti** kwenye production |
| `CLOUDINARY_CLOUD_NAME` | e.g. `genz-media` | Pata kwenye [Cloudinary Console](https://console.cloudinary.com) → Dashboard |
| `CLOUDINARY_API_KEY` | `123456789012345` | Cloudinary Dashboard |
| `CLOUDINARY_API_SECRET` | `abcdefghijklmnopqrstuvwxyz` | Cloudinary Dashboard |
| `VAPID_PUBLIC_KEY` | (unaweza kuhamisha kutoka `backend/.env`) | Push notifications |
| `VAPID_PRIVATE_KEY` | (hamisha kutoka `backend/.env`) | Push notifications |
| `VAPID_SUBJECT` | `mailto:admin@genz-whatsapp.com` | |
| `ADMIN_BASE_PATH` | `/api/system-gateway-x9k` | Path ya admin API (weka tofauti ikiwa unataka) |
| `RP_ID` | `genz-whatsapp-1.onrender.com` | Domain halisi (bila `https://`) kwa Passkeys/WebAuthn |
| `ALLOW_ANONYMOUS_DEVICE_AUTH` | `false` | |
| `ALLOW_MOCK_PAYMENTS` | `false` | `true` inakataza server kuanza kwenye production! |
| `PHONE_VERIFICATION_REQUIRED` | `false` (au weka OTP channel) | Ikiwa `true`, lazima uweke `WHATSAPP_OTP_ENABLED=true` + `WHATSAPP_CLOUD_API_*` — vinginevyo wasajili wapya wote wamefungiwa |
| `MANUAL_PAYMENT_RECEIVER_NAME` | `Jina Lako Rasmi` | Namba ya mobile money ya kupokea malipo |
| `MANUAL_PAYMENT_RECEIVER_NUMBER` | `0XXXXXXXXX` | Namba ya mobile money |

> 💡 **Kutengeneza secrets kwenye Windows (Git Bash / WSL):**
> `openssl rand -hex 32` — endesha mara kadhaa kwa kila secret. Usitumie tena
> thamani za `backend/.env` za development kwenye production.

## Hatua 3 — Angalia hizi zisipatikane (kwa sababu zinakataza kuanza)

- ❌ `MONGODB_URI` isiyo na `localhost` — lazima iwe Atlas/remote
- ❌ `JWT_REFRESH_SECRET` sawa na `JWT_SECRET`
- ❌ `ALLOW_MOCK_PAYMENTS=true`
- ❌ `FRONTEND_URL` / `PUBLIC_API_URL` bila `https://`
- ❌ Maadili ya placeholder: `change-me`, `your-...`, `example.com`
- ❌ `CLOUDINARY_*` tupu

## Hatua 4 — Deploy upya

1. Render → service `genz-whatsapp` → **Manual Deploy → Deploy latest commit**
   (hakikisha commit ya hivi karibuni iko kwenye branch iliyounganishwa — kwa sasa `debf9c5`)
2. Subiri deploy ikamilike (5–10 min); angalia **Logs** — utaona
   `Environment validation passed (production)` ikiwa env zote ni sahihi
3. Ukipata `CRITICAL: Environment validation failed:` — log itaonyesha key gani
   imekosekana; rekebisha kwenye Environment → Redeploy

## Hatua 5 — Thibitisha (verification)

```bash
curl https://genz-whatsapp-1.onrender.com/api/health
```

**Lazima uone:**
```json
{"success":true,"status":"ok","services":{"mongo":"connected","redis":"connected","mediaStorage":"cloudinary"}}
```

- `mongo: connected` → Atlas iko sawa
- `mediaStorage: cloudinary` → media haitapotea kwenye redeploy ✅
- Ikiwa unaona `mediaStorage: "local"` → Cloudinary haijawekwa → weka na redeploy

**Kisha jaribu kwa mkono:**
1. Fungua `https://genz-whatsapp-1.onrender.com/login` → register mtumiaji mpya
2. Tuma ujumbe → pakia picha → premium (malipo manual)
3. Fungua admin panel `https://genz-whatsapp-1.onrender.com/system-control-x7k9/login`
   → weka username + password ya AdminOwner (inaundwa na `ADMIN_BOOTSTRAP_TOKEN`)

---

## Hitilafu za kawaida

| Dalili | Suluhisho |
|---|---|
| `CRITICAL: Environment validation failed: CLOUDINARY_*` | Weka Cloudinary keys zote 3 → redeploy |
| `mongo: disconnected` kwenye health | Angalia `MONGODB_URI` — lazima iwe Atlas (sio localhost), hakikisha Atlas IP whitelist inaruhusu Render (`0.0.0.0/0` au Render IP) |
| `JWT_REFRESH_SECRET must be different from JWT_SECRET` | Generate secrets tofauti |
| Deploy inaisha lakini health haipiti | Fungua **Logs** la Render — kuna error ya kuanza; rekebisha env → redeploy |
| Passkeys hazifanyi kazi | `RP_ID` lazima iwe domain halisi bila `https://` |
