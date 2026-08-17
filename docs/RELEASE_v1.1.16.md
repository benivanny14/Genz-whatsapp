# Release v1.1.16 — Status trust & privacy

**2026-08-18** · versionCode 19 · APK: `frontend/public/genz-whatsapp.apk`

## What's new

### Mute status updates now actually works
- Muting was stored but never enforced — both status feeds ignored
  `mutedStatusUsers`. Muted posters are now flagged `isMuted`, sink to the
  bottom of the feed (WhatsApp behaviour) with a bell-off indicator, and the
  row button becomes **Unmute**.
- New `POST /status-advanced/:id/unmute` — previously a mute could only expire.
- Mute durations parse correctly (`1h`/`8h`/`24h`/`1w`/`1m`/`forever`);
  string durations used to produce an Invalid Date expiry.

### Block from status is a full loop
- Blocking refreshes the feed instantly (poster disappears).
- New `POST /status-advanced/:id/unblock` + `GET /status-advanced/blocked-users`,
  plus a **Blocked From Status** panel (Shield button in the Status header).
- Unblocking lifts a chat block too when the block had `blockChatsToo` set
  (WhatsApp semantics).

### Expiring share tokens replace public statuses
- Statuses can no longer be created as `everyone` (WhatsApp parity).
- Owners mint an HMAC-signed 24h token (`POST /status-advanced/:id/share-token`);
  QR and Share panels append `?share=…`, so anonymous visitors can view one
  status without it being public. Tokens are stateless; block checks still apply.
- Fixed: the shared-status viewer (`/status/:statusId`) no longer hard-redirects
  anonymous visitors to `/login` (missing in the public-path list).

## Verification
- Backend **1728/1728** (serial, `USE_LOCAL_MONGO_FOR_TESTS=true`)
- Frontend **94/94** + build ✓
- E2E: `status-mute-block.spec.js` 3/3, `status-share-token.spec.js` 3/3
  (anonymous browser view with token, denial without)

## Ship
```bash
git push origin main          # triggers Render deploy + CI
git tag v1.1.16 && git push origin v1.1.16   # triggers build-apk workflow
```
