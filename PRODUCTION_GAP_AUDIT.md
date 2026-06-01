# GENZ / TM WhatsApp Production Gap Audit

Date: 2026-05-13

## Executive Summary

Mfumo unajenga na backend inaanza. Baada ya marekebisho ya 2026-05-13, P0 nyingi zimefungwa: auth routes zimeongezwa, security controller si placeholder tena, chat/advanced/device/voice/media routes zimewekwa chini ya auth/device fallback, contacts/blocking/GENZ Mods zimehifadhiwa DB, backup imehamishwa backend, push subscription storage imeongezwa, WebRTC event mismatch imefungwa, hardcoded upload URLs zimepunguzwa, na deployment/CI scaffolding imeongezwa. Bado kuna P1/P2 za production-grade product kama live payment credentials/provider checkout, TURN server, object storage/CDN, monitoring, na full e2e/load/security tests.

Current technical checks:
- Frontend build: passes.
- Backend JS syntax check: passes.
- Backend health: passes when backend is running on port 5000.
- Main API endpoints tested: `/api/device`, `/api/genz-mods/settings`, `/api/advanced/broadcast`, `/api/advanced/status` return 200.
- Auth/security integration tested on port 5050: `/api/auth/register` and `/api/security/settings` return 200 with JWT.
- Socket.IO websocket connection tested on port 5050: connected successfully.
- Latest smoke on port 5058: `/api/health`, `/api/device`, `/api/voice`, `/api/backup/status`, and `/api/notifications/vapid-public-key` return 200.
- Backup create/delete and notification subscribe/unsubscribe were smoke-tested successfully on isolated test ports.

## Implementation Update - 2026-05-13

Completed in this pass:
- Added `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/profile`, and `/api/auth/logout`.
- Added password hashing with Node crypto, JWT issuance, roles, device fallback, and safer admin checks.
- Replaced disabled security placeholders with working 2FA setup/verify/disable, email verification token flow, password reset token flow, and security settings/status endpoints.
- Wired `backend/socket/index.js` into `backend/server.js` and fixed the unreachable frontend socket listeners.
- Fixed `/api/chat/messages/:id/delete-for-everyone` frontend route mismatch.
- Converted chat/advanced local user usage away from invalid `local-user` ObjectId strings.
- Added login/register pages and routes for forgot/reset/verify email pages.
- Added env-based API URLs for broadcast/device/mods/security services.
- Added Docker deployment files and `.env.example` updates.

## Implementation Update - Pass 2 - 2026-05-13

Completed in this pass:
- Protected chat, advanced, media, device, voice, backup, GENZ Mods, and payment user routes with `protect` while preserving local device fallback for development.
- Reworked chat ownership checks for conversations, messages, groups, reactions, contacts, search, block, and unblock.
- Reworked status/broadcast/scheduled/search advanced flows to use the authenticated user and env-based public media URLs.
- Added DB-backed GENZ Mods persistence, auto-reply settings, deleted-message tracking, stats, export/import, and privacy toggles.
- Reworked payment subscription status/history/admin activate/deactivate around real user ownership; dev/mock mode remains only as a safe local fallback.
- Replaced browser IndexedDB backend backup import with encrypted MongoDB backup/restore using local storage fallback or S3 when configured.
- Added backend push subscription model/routes and frontend browser PushManager registration path.
- Added frontend `ProtectedRoute` with `VITE_REQUIRE_AUTH=true` production enforcement.
- Fixed WebRTC signaling aliases for both `webrtc:*` and `call:*` event families.
- Added backend syntax-check script, root check script, and GitHub Actions CI scaffold.
- Replaced frontend backup placeholder service with backend API calls and replaced encryption placeholder service with WebCrypto ECDH/AES-GCM implementation.

## Recheck - What Is Still Missing

This is the current remaining checklist after the latest implementation pass:

1. Live payments still require real provider completion.
   - Mock/dev mode is still intentionally available for local testing.
   - Production needs real checkout URLs, real credentials, provider sandbox/live QA, webhook signature secrets, and settlement reconciliation.

2. WebRTC calls still need TURN.
   - Event mismatch is fixed.
   - Production still needs TURN credentials/server, call state persistence, missed-call history, and failure recovery.

3. Media storage is still local-disk based.
   - Upload URLs are now env-based, but storage is still `uploads/`.
   - Production should use S3/Cloudinary/object storage, CDN, file scanning, retention cleanup, and signed/private URLs if needed.

4. Push notifications still need Web Push send provider wiring.
   - Backend now stores push subscriptions and frontend registers browser subscriptions when VAPID is configured.
   - Actual push delivery needs VAPID private key plus Web Push/FCM sender service and retry cleanup.

5. E2EE needs product-wide integration.
   - WebCrypto encryption service now works as a real foundation.
   - The message send/read path still needs to consistently call it and manage recipient public keys.

6. Production observability and comprehensive tests are still needed.
   - CI scaffold and syntax/build checks exist.
   - Still needed: API tests, socket tests, webhook tests, browser e2e, load tests, structured logs, metrics, error tracking, and alerts.

## P0 - Must Fix Before Real Users

1. Real authentication and user accounts: mostly fixed.
   - Login/register routes and pages are now wired.
   - JWT auth and device fallback coexist.
   - Remaining: refresh-token/session revocation and production cookie strategy.

2. Security features: mostly fixed.
   - 2FA/email/password reset endpoints now perform real token/secret work.
   - Remaining: configure SMTP in production and add abuse/rate-limit tests.

3. Socket system: fixed for the main mismatch.
   - Modern socket handlers are now wired.
   - Frontend listeners are now reachable.
   - Remaining: consolidate duplicate legacy handlers over time.

4. Mongo schema/controller IDs: fixed for chat, advanced, device, voice, payment, backup, and notification paths touched in this pass.
   - Remaining: continue auditing legacy socket/mock-only paths over time.

5. Production authorization: improved.
   - `isAdmin` checks real role/admin flags in production.
   - Development device fallback can still access admin routes to avoid breaking existing local workflows.
   - Remaining: assign real admin roles and add admin UI guard.

6. Deployment configuration: partly fixed.
   - Dockerfiles, docker-compose, nginx config, and deployment notes are added.
   - Remaining: CI pipeline and host-specific files such as render.yaml/vercel/netlify if that target is chosen.

## P1 - Needed For 100 Percent Product Completion

1. Real contacts and user discovery: implemented.
   - `/api/chat/users/search`, contacts, block, and unblock now use DB-backed user ownership.

2. Real GENZ Mods persistence: implemented for core settings.
   - Remaining: broader UI coverage and QA for every mod toggle.

3. Real payments and subscription lifecycle.
   - `paymentController` uses mock/dev mode in development and real-user subscription ownership.
   - Admin activate/deactivate/user payment details are implemented.
   - Webhook secrets, live provider credentials, idempotency, and production callbacks must be tested with real providers.

4. Media storage for deployment.
   - Upload URLs are env-based now.
   - Production needs S3/Cloudinary/object storage, signed URLs if private, CDN, file scanning, and limits per type.

5. Backup is implemented as encrypted backend backup.
   - Local fallback works; S3 works when AWS env vars are configured.
   - Remaining: scheduled cron runner and production restore QA.

6. Push notifications are not production-ready.
   - Backend registration flow exists.
   - Remaining: actual Web Push/FCM delivery service.

7. AI features are not real enough for production.
   - AI assistant is simulated.
   - Translation falls back to prefixing text if LibreTranslate fails.
   - API keys/provider configuration and user-facing failure states need completion.

8. WebRTC calls need production networking.
   - Signaling mismatch is fixed.
   - Production needs TURN server, call state persistence, missed calls, permissions UX, and failure recovery.

9. Frontend API base URLs are mostly aligned.
   - Broadcast/device/mods/security now use `VITE_API_URL` with localhost fallback.

10. Known delete-for-everyone route mismatch is fixed.

## P2 - Production Quality Requirements

1. Comprehensive tests are still missing.
   - Backend syntax script, frontend build, and CI scaffold exist.
   - Need API tests, socket tests, payment webhook tests, e2e browser tests, and mobile responsive checks.

2. Monitoring and observability are missing.
   - Need structured logs, request IDs, error tracking, uptime checks, API latency metrics, DB metrics, and alerts.

3. Security hardening remains.
   - Need real auth, role checks, rate-limit tuning, secure cookies/tokens, input validation coverage, upload scanning, CORS by environment, CSP by domain, and secrets management.

4. Production env and docs need alignment.
   - README and older reports should be refreshed to match the current auth, backup, push, payments, and deployment flow.

## Recommended Build Order

1. Configure real production env: MongoDB, JWT, SMTP, PUBLIC_API_URL, FRONTEND_URL, VAPID, payment secrets, and admin user.
2. Add real provider checkout/webhook QA for M-Pesa/Airtel/Yas/HaloPesa/card.
3. Add TURN server and call-state persistence.
4. Move media from local disk to object storage/CDN.
5. Wire Web Push/FCM delivery from stored subscriptions.
6. Integrate WebCrypto E2EE into the actual message send/read path.
7. Add API/socket/webhook/e2e/load tests and connect them to CI.
8. Add monitoring, logs, metrics, alerts, and production runbooks.
9. Perform full desktop/mobile QA before go-live.
