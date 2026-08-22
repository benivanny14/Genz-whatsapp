# Notification Architecture Analysis — GENZ Messenger APK

## Current State

### App Type: **Capacitor** (NOT TWA)
- `capacitor.config.json` exists with appId `com.benivanny.genzwhatsapp`
- `MainActivity.java` extends `BridgeActivity` (Capacitor's base class)
- No `twa-manifest.json` or `assetlinks.json` — this is NOT a Trusted Web Activity

### Notification Flow

| Scenario | Mechanism | Works? |
|----------|-----------|--------|
| **App in foreground** | Socket.io → `genz-in-app-notification` toast | ✅ Yes |
| **App in foreground** | Socket.io → `showNativeNotification()` via `@capacitor/local-notifications` | ✅ Yes |
| **App backgrounded (not killed)** | `LocalNotifications.schedule()` fires Android system notification | ⚠️ Partially — depends on OS battery optimization |
| **App killed/closed** | FCM Push via `@capacitor/push-notifications` | ❌ **Not configured** |

### Why Background Push Does NOT Work

1. **No `google-services.json`** — the Firebase configuration file is missing from `android/app/`
2. **`__GENZ_FCM_ENABLED__` = false** — `vite.config.js` line 35 checks for `google-services.json` at build time; since it's absent, the flag is `false`
3. **`initNativePush()` short-circuits** — `capacitorBridge.js` line 223: `if (!FCM_ENABLED) return { success: false, reason: 'fcm-not-configured' }`
4. **Result**: The app relies entirely on `LocalNotifications` (foreground-only) + socket.io real-time events. When the app is fully killed, Android cannot wake it to receive messages.

### What Works Today
- ✅ Real-time messages (socket.io) when app is open
- ✅ In-app toast notifications when app is in foreground
- ✅ Local system notifications when app is in foreground (via `LocalNotifications` plugin)
- ✅ Vibration patterns for messages

### What Does NOT Work
- ❌ Notifications when app is closed/killed (no FCM)
- ❌ Reliable background notifications on some OEM ROMs (Xiaomi, Huawei, Samsung aggressive battery management)
- ❌ Badge count on app icon (requires launcher badge plugin + FCM)
- ❌ Data-sync while app is killed (no background service without FCM)

---

## What Needs to Change for Full Push Notifications

### Option A: Firebase Cloud Messaging (Recommended)

**Cost**: Free (Firebase Spark plan handles 50M+ notifications/month)

#### Step 1: Create Firebase Project
1. Go to https://console.firebase.google.com/
2. Create a new project (e.g., "Genz Messenger")
3. Add Android app with package name `com.benivanny.genzwhatsapp`
4. Download `google-services.json`

#### Step 2: Add to Project
```
frontend/android/app/google-services.json  ← place the downloaded file here
```

#### Step 3: Build the APK
The Vite build script (`vite.config.js`) auto-detects `google-services.json`:
```bash
cd frontend && npm run apk:build
```
The flag `__GENZ_FCM_ENABLED__` will become `true`, and `capacitorBridge.js`
will register the FCM token with the backend on startup.

#### Step 4: Backend Changes Needed
The backend needs to send push notifications via FCM Admin SDK:

1. **Install**: `npm install firebase-admin` in `backend/`
2. **Initialize**: Add Firebase Admin SDK initialization with a service account key
3. **FCM Token Storage**: The endpoint `POST /api/notifications/fcm/register` already exists
4. **Send Push**: Modify message delivery to also send FCM push:
   ```js
   // When delivering a message via socket, also send FCM push
   // so users with killed apps still get notified
   const admin = require('firebase-admin');
   
   // Send to all other participants' FCM tokens
   const tokens = await FCMToken.find({ userId: { $in: otherParticipantIds } });
   const message = {
     notification: { title: senderName, body: messagePreview },
     data: { conversationId, messageId, type: 'message' },
     tokens: tokens.map(t => t.token)
   };
   await admin.messaging().sendEachForMulticast(message);
   ```

#### Step 5: Battery Optimization Bypass
For reliable delivery on aggressive OEM ROMs:
1. Tell users to disable battery optimization for GENZ Messenger
2. Or implement `@nicepkg/capacitor-request-battery-optimization` plugin

### Option B: No Changes (Current State)
The app works in foreground-only mode. This is acceptable for a web-based
messenger, but users will NOT get notified of new messages when the app is
closed — they must open the app to check.

---

## Summary of Changes Required for FCM

| What | Who | Effort |
|------|-----|--------|
| Create Firebase project | User/Owner | 10 minutes |
| Place `google-services.json` | User/Owner | 1 minute |
| Rebuild APK (`npm run apk:build`) | Developer | 5 minutes (auto-detected) |
| Backend: Install `firebase-admin` | Developer | 5 minutes |
| Backend: Initialize Firebase Admin SDK | Developer | 15 minutes |
| Backend: Add FCM send on message delivery | Developer | 30 minutes |
| Total | | ~1 hour |

**Recommendation**: Start with Option A. The frontend code is already fully
wired — it gracefully degrades without FCM and activates automatically when
`google-services.json` is present. Only the backend needs modification.
