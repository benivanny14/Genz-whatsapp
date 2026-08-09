# GENZ WhatsApp — Production Readiness Checklist

This checklist covers everything that must be configured before GENZ WhatsApp
is exposed to a large number of real users. Each item is either a deployment
environment variable (set in Render/Railway/VPS) or a code decision.

> 🚀 **Fast path:** run `scripts/setup-render-env.js` (see
> `RENDER_DEPLOY_GUIDE.md` for the step-by-step walkthrough). It sets every
> variable below, auto-generates missing secrets and VAPID keys, refuses
> placeholders, and saves generated secrets to `backend/.env`.

---

## 🔴 Required before launch

### 1. Media storage (Cloudinary) — WITHOUT THIS, MEDIA IS LOST ON REDEPLOY
The server stores uploads on the local disk when Cloudinary is not configured
(`/api/health` → `mediaStorage: "local"`). Render's disk is **ephemeral** —
every redeploy wipes uploaded images/videos. Configure Cloudinary:

```
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

Verify: `/api/health` returns `"mediaStorage":"cloudinary"` after redeploy.

### 2. Payment flow decision
Payments are currently **manual**: the user pastes a mobile-money confirmation
SMS and an admin approves it by hand. That does not scale.

- At minimum, set the real receiving account (do not ship the hardcoded default):
  ```
  MANUAL_PAYMENT_RECEIVER_NAME=...
  MANUAL_PAYMENT_RECEIVER_NUMBER=...
  ```
- Decide who approves payments and how fast (SLAs). Consider automating later:
  parse + verify the transaction ID against the operator, or move to a real
  payment provider API.

### 3. React Native app
`react-native/` is a **static mock prototype** (hardcoded data, no backend
connection). Do not publish the APK (`frontend/public/genz-whatsapp.apk`) to
users. Either build out the real integration or remove it from the release.

### 4. Honest encryption messaging
Client-side E2EE is a mod, **off by default**. The UI has been corrected to say
so. Do not re-add unconditional "end-to-end encrypted" claims until E2EE is on
by default.

---

## 🟠 Strongly recommended before scaling

### 5. Redis (horizontal scaling + presence)
Without Redis the socket layer is single-instance and online/presence state
resets on restart. Add:
```
REDIS_URL=redis://...
```
The server auto-attaches the Redis Socket.IO adapter + presence store when set.

### 6. TURN server (voice/video calls behind NAT)
Calls will fail for many mobile networks without a TURN server:
```
METERED_TURN_USERNAME=...
METERED_TURN_PASSWORD=...
# or
TURN_SERVER_URL=...
TURN_USERNAME=...
TURN_CREDENTIAL=...
```

### 7. SMTP (password reset / notifications)
```
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
MAIL_FROM=...
```

### 8. Web Push (VAPID) — background notifications
```
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@your-domain.com
```
Generate: `node backend/scripts/generate-vapid.js`

### 9. WhatsApp OTP delivery
`WHATSAPP_OTP_ENABLED=true` uses whatsapp-web.js (consumer protocol) — the
linked number can be **banned** for bulk OTP traffic. Prefer the WhatsApp
Business Cloud API for scale:
```
WHATSAPP_OTP_ENABLED=false
WHATSAPP_CLOUD_API_TOKEN=...   # (see backend/services/whatsappCloudApiService.js)
```

---

## 🟡 Security housekeeping

- [ ] `npm audit` cleanup: backend 21 vulns (1 low, 20 moderate), frontend had 4
      high (removed by dropping the unused `firebase` dependency — re-run
      `npm audit` after install).
- [ ] `JWT_SECRET`, `JWT_REFRESH_SECRET` (different!), `ADMIN_JWT_SECRET`,
      `ADMIN_BOOTSTRAP_TOKEN` — all strong random strings ≥ 32 chars.
- [ ] `BACKUP_ENCRYPTION_KEY`, `MESSAGE_ENCRYPTION_SECRET` — strong random
      strings ≥ 32 chars.
- [ ] `ADMIN_IP_ALLOWLIST` — restrict admin panel IPs if possible.
- [ ] `ALLOW_ANONYMOUS_DEVICE_AUTH=false`, `ALLOW_MOCK_PAYMENTS=false` in prod.

---

## 🟢 Infrastructure hardening (implemented)

- **Circuit breakers** (`backend/utils/circuitBreaker.js`) guard every external
  API call: Cloudinary uploads (fall back to local `/uploads` serving when the
  circuit is open, so media sends never fail), Cloudinary delete/resource calls
  (fail soft), WhatsApp Cloud API (fast-fail after 3 failures, 60s cooldown),
  LibreTranslate + GIPHY (fall back to local translation / fallback GIFs). All
  calls are also wrapped in timeouts.
- **API versioning** — every route is mounted under both `/api/...` (legacy,
  what the current frontend calls) and `/api/v1/...`. **New code should use
  `/api/v1`.** Routes are declared in one `API_ROUTE_MOUNTS` array in
  `backend/server.js`; health + upload are versioned too.
- **Response caching** (`backend/utils/responseCache.js`) — bounded in-memory
  TTL cache (200 entries max, per-entry expiry): health payload (5s), GIF
  search (60s), link previews (5 min per URL).
- **Cache headers** — all `/api` responses default to `Cache-Control: no-store`
  (auth/user data); public endpoints (GIFs, link previews) override with
  `public, max-age=...`.
- **Memory-leak cap on socket dedup** — `messageDeduplication` Map is capped at
  10,000 entries with 60s TTL and 30s cleanup sweep.

---

## ✅ Post-deploy verification

1. `curl https://YOUR-URL/api/health` → `"mongo":"connected"`, `"redis":"connected"`,
   `"mediaStorage":"cloudinary"`.
2. Register a test user → receive OTP → verify phone → send a message between
   two accounts → image upload survives a redeploy.
3. Make a manual payment as a user → approve in admin panel → Premium unlocks.
4. Restart the server → sockets reconnect, presence returns, passkey login
   still works (challenges are now persisted in the DB).
