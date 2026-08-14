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

### 3. Native app = the Capacitor web APK
There is no separate native codebase — the Android APK is built from this web
app via Capacitor (`frontend/android` + `frontend/scripts/build-apk.js`).
(The old `react-native/` static mock was removed in v1.1.11.)
Release the APK only after `npm run apk:build` produces a signed build; the
download button on the login page points at the matching GitHub release.

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

### 6. ~~TURN server~~ — voice/video calls removed
GENZ is a **pure messaging app**: voice/video/group calls were removed entirely
(v1.1.14), so no TURN/STUN/ICE configuration is needed anymore.

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

- [x] `npm audit` cleanup (as of 2026-08-11): backend **0 high / 0 critical**;
      16 moderate remain, all transitive from `artillery` (load-testing dev
      tool, via `@opentelemetry/*`) — the only fix is a breaking
      `artillery@1.7.9` upgrade, so runtime dependencies are clean. Frontend:
      **0 vulnerabilities** after the `vite@5` → `vite@8.2.1` upgrade (with
      `@vitejs/plugin-react@6`). Re-run `npm audit` after any dependency
      change.
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
