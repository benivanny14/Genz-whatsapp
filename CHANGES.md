# Genz WhatsApp — Audit Fixes Changelog

This file summarizes every change made during the full-system audit and fix pass.

## Backend fixes

1. **Calls (WebRTC)** — `frontend/src/services/webrtc.js`
   Duplicate signaling events (`call:answered` + `webrtc:answer`) caused `setRemoteDescription`
   to be called twice, throwing `InvalidStateError`. `handleAnswer()` is now idempotent.

2. **Calls — disconnect cleanup** — `backend/utils/activeCalls.js`, `backend/socket/index.js`
   If a user disconnected mid-call, the other party's screen hung forever with no `call:ended`.
   Added `activeCalls.endAllCallsForUser()` and wired it into the socket `disconnect` handler.

3. **Groups — pending approval invite links** — `frontend/src/pages/JoinGroup.jsx`
   Backend correctly returns `pending: true` for groups requiring admin approval, but the
   frontend never checked it and falsely said "You joined the group!". Fixed.

4. **Groups — broken contacts-privacy check** — `backend/controllers/chatController.js`
   `contacts` are `{user, savedName}` subdocuments; comparing `c.toString()` directly never
   matched, silently blocking every legitimate group-add for privacy `'contacts'` users.
   Fixed in `createGroup` and `addParticipant`.

5. **Status — privacy leak (critical)** — `backend/controllers/statusController.js`
   Every user's status was shown to every other user regardless of the poster's
   `privacy.status` setting (default `'contacts'`) or actual contact relationship. Fixed to
   respect `nobody`/`contacts`; `contacts_except`/`only_share_with` safely fall back to
   contacts-only pending dedicated include/exclude-list fields.

6. **Notifications — muted/active-viewer over-notification** — `backend/controllers/chatController.js`,
   `backend/socket/index.js`
   Muted chats and chats the recipient was actively viewing still triggered push notifications.
   Both send paths now check `mutedUntil` and conversation-room membership before pushing.

7. **File uploads — voice notes skipped validation (security)** — `backend/routes/voiceRoutes.js`
   The only upload route that never ran `validateFileContent` (magic-byte check), trusting the
   spoofable client `Content-Type` only. Now wired in like every other upload route.

8. **Channels — follower count race** — `backend/routes/channelRoutes.js`
   `$inc` ran unconditionally alongside `$addToSet`/`$pull`, so double-follow/unfollow could
   inflate or negative the count. Now checks membership before mutating.

9. **Broadcast lists — bypassed block feature, no push** — `backend/controllers/advancedController.js`
   Broadcast sends never checked the block relationship (could message someone who blocked you)
   and never pushed notifications to offline recipients. Both fixed.

10. **Group invite links — dead end for logged-out users** — `frontend/src/pages/JoinGroup.jsx`,
    `frontend/src/pages/Login.jsx`
    Unauthenticated visitors got a generic error instead of being sent to log in and resuming
    the join afterward. Login now honors `ProtectedRoute`'s `state.from` / `?redirect=`.

11. **Typing indicator — global broadcast leak + stuck-forever bug** — `backend/socket/index.js`
    `stop_typing`/`recording` used `socket.broadcast.emit(...)`, reaching every online user on
    the entire server regardless of conversation. Scoped to the conversation room. Also added
    disconnect cleanup so a dropped connection mid-typing doesn't leave the other side's screen
    showing "typing…" forever.

12. **Read receipts — unread-count race condition** — `backend/controllers/chatController.js`
    `markAsRead` used a read-modify-write pattern (fetch count, decrement in JS, save) that lost
    updates under concurrent requests — common when opening a chat with several unread messages.
    Replaced with atomic MongoDB `$inc`/`$push` operations.

## New feature: Channels feed

Previously Channels only supported discover/create/follow — no way to post or view content.

- `backend/models/ChannelPost.js` — new model
- `backend/routes/channelRoutes.js` — GET single channel, list/create/delete posts, view
  tracking, reactions (owner-only posting, follower-gated private channels)
- `backend/socket/index.js` — `join:channel`/`leave:channel` rooms for live post delivery
- `frontend/src/pages/ChannelView.jsx` — new feed page
- `frontend/src/pages/Channels.jsx`, `frontend/src/App.jsx` — routing/navigation wiring

## GENZ Mods — wired up previously-dead toggles

- **`autoDownloadMedia`** — `frontend/src/components/SignedMedia.jsx` now shows a "tap to
  download" placeholder for images/videos when disabled, instead of always auto-loading.
- **`alwaysOnline`** — built a real idle/away presence system that didn't exist before
  (`User.status` schema had `'away'` in its enum but nothing ever used it):
  - `frontend/src/context/ChatContext.jsx` — idle detection (5 min inactivity or hidden tab),
    emits `presence:update`; skipped entirely when `alwaysOnline` is on
  - `backend/socket/index.js` — `presence:update`/`presence:changed` handlers, broadcasts to
    conversation participants only
  - `frontend/src/components/ContactInfo.jsx` — shows "Away" distinctly from "Online"

## Accessibility

- Manually added `aria-label` to the highest-traffic icon-only buttons across `Sidebar.jsx`,
  `ChatArea.jsx`, `VoiceRecorder.jsx`, `GroupInfo.jsx`, `ContactInfo.jsx`, `StatusViewer.jsx`.
- Automated pass #1: copied existing `title="..."` text to `aria-label` where missing (safe,
  reuses already-authored intent) — ~74 buttons across 20+ files.
- Automated pass #2: icon-component-name → label mapping (X→Close, Trash2→Delete, etc.) for
  single-icon buttons with no existing label — ~129 buttons across 57 files.

## Verified correct, no changes needed

Admin panel authorization, database indexing, disappearing-messages TTL, link-preview SSRF
protection, XSS surface (no `eval`/`dangerouslySetInnerHTML` misuse), E2EE (genuinely real —
ECDH-P256 + AES-256-GCM via WebCrypto, on by default), payment webhook signature verification,
deployment env config (`render.yaml` hardcodes `NODE_ENV=production`).

## Known remaining gaps (flagged, not silently skipped)

- `LOCAL_USER_ID` hardcoded fallback pattern in 8 controllers — currently safe (every route has
  `protect`) but fragile long-term; worth removing outright.
- A handful of lower-traffic modals still have some unlabeled icon buttons beyond the two
  automated passes' coverage.
