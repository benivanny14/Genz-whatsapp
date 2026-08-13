# GENZ WhatsApp — Firebase FCM Setup Guide (real push notifications)

The web app already sends **web push** using only VAPID keys — that works in
desktop browsers with zero Firebase setup.

This guide is for the **installed apps** (Android APK + iOS build). Inside a
native WebView the web Notification API is unavailable and the OS controls the
notification channel, so background pushes must go through **Firebase Cloud
Messaging (FCM)**:

- The APK registers an FCM token via `POST /api/notifications/fcm/register`
  (see `frontend/src/services/capacitorBridge.js`).
- The backend sends pushes through the Firebase Admin SDK
  (`backend/config/firebase.js` + `backend/services/notificationService.js`).

**Without this setup the app still works** — the Capacitor bridge simply logs
"no Firebase project configured" and skips token registration. In-app toasts
and local notifications still fire while the app is open.

---

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com → **Add project** → name it (e.g.
   `genz-whatsapp`) → follow the wizard (Google Analytics is optional).
2. You will add **two apps** to this one project (Android + iOS) plus a
   **service account** for the backend.

---

## 2. Android app (for the APK)

1. In the Firebase console: ⚙️ **Project settings** → **Your apps** →
   **Add app** → **Android**.
2. **Android package name** must be exactly:
   ```
   com.benivanny.genzwhatsapp
   ```
   (this is `applicationId` in `frontend/android/app/build.gradle`).
   App nickname e.g. "GENZ WhatsApp APK". Click **Register app**.
3. Download **google-services.json** and place it at:
   ```
   frontend/android/app/google-services.json
   ```
   > ⚠️ This file is **gitignored** — it contains API keys. Never commit it.
   > Keep a backup somewhere private (password manager / secure drive).
4. No need to add the Firebase SDK snippet — the Capacitor Push Notifications
   plugin already bundles it. `frontend/android/app/build.gradle`
   auto-applies the `com.google.gms.google-services` plugin the moment the
   file exists.
5. **Rebuild the APK** so the plugin is baked in:
   ```bash
   cd frontend
   npm run apk:build     # web build → cap sync → gradle assembleRelease → public/genz-whatsapp.apk
   ```

---

## 3. iOS app (for the Xcode build)

1. In the same Firebase project: ⚙️ **Project settings** → **Your apps** →
   **Add app** → **iOS**.
2. **iOS bundle ID** must be exactly:
   ```
   com.benivanny.genzwhatsapp
   ```
   (set in Xcode → App target → Signing & Capabilities → Bundle Identifier).
   Click **Register app**.
3. Download **GoogleService-Info.plist** and place it at:
   ```
   frontend/ios/App/App/GoogleService-Info.plist
   ```
   > ⚠️ Also **gitignored**. Never commit it.
4. Add one line to `frontend/ios/App/App/AppDelegate.swift` so the SDK boots
   with this plist (Capacitor's push plugin relies on it):
   ```swift
   import FirebaseCore
   // in AppDelegate.application(_:didFinishLaunchingWithOptions:), before super:
   FirebaseApp.configure()
   ```
5. Rebuild in Xcode. **Push capability**: in Xcode → target → **Signing &
   Capabilities** → add **Push Notifications**. If you later ship through
   TestFlight/App Store you also need an APNs key uploaded in the Apple
   Developer portal + a paid account — the app itself needs no code change.

---

## 4. Backend credentials (Firebase Admin SDK)

The backend sends pushes using a **service account** private key. Add it to
the **backend environment** — on Render set these in Dashboard → Environment;
locally add them to `backend/.env`.

1. Firebase console → ⚙️ **Project settings** → **Service accounts** →
   **Generate new private key** → download `genz-whatsapp-firebase-adminsdk.json`.
2. Extract the values into these env vars (Render env vars, all `sync: false`
   so they are not committed to `render.yaml`):

   | Env var | From the JSON |
   |---|---|
   | `FIREBASE_PROJECT_ID` | `project_id` |
   | `FIREBASE_CLIENT_EMAIL` | `client_email` |
   | `FIREBASE_PRIVATE_KEY` | `private_key` — **keep the `\n` as literal `\n`** (the code un-escapes them) |
   | `FIREBASE_PRIVATE_KEY_ID` | `private_key_id` |
   | `FIREBASE_CLIENT_ID` | `client_id` |

   Example (Render):
   ```
   FIREBASE_PROJECT_ID=genz-whatsapp
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@genz-whatsapp.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqh...\n-----END PRIVATE KEY-----\n
   ```
3. Restart the backend. It logs:
   ```
   [Firebase] Firebase Admin SDK initialized successfully
   ```
   (If credentials are missing you'll see "Push notifications will be
   disabled." — the app keeps working, just no FCM pushes.)

---

## 5. Verify the full loop

1. **Backend up** with the env vars above.
2. Install the rebuilt APK on a phone (or run the iOS build), open the app,
   log in, and grant notification permission.
3. Backend log should show a token registration hit on
   `POST /api/notifications/fcm/register`.
4. Grab the token (dev: check the registered user doc / backend log) and send
   a test push from the Firebase console:
   Cloud Messaging → **Create notification** → **Send test message** → paste
   the token. The phone should show a system notification with the app
   icon **even with the app killed**.
5. Alternatively trigger a real push from the app itself (e.g. a new message
   while the app is backgrounded) and watch `backend/services/notificationService.js`
   log `[Firebase] Multicast notification sent: { successCount, failureCount }`.

### Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `[Firebase] Firebase credentials not configured` | Backend env vars missing — see §4. |
| APK builds but no pushes arrive | `google-services.json` missing/wrong package id — see §2; rebuild the APK. |
| `messaging/registration-token-not-registered` | Token was invalidated; the backend auto-prunes it (`$pull` in `notificationService.js`). |
| iOS push not delivered | `GoogleService-Info.plist` missing, `FirebaseApp.configure()` not called, or Push capability not enabled in Xcode (§3). |
| Notifications work in-app but not backgrounded | FCM requires the google-services setup — web-push-style VAPID alone never reaches the APK. |

---

## Files touched by this setup (all gitignored — never commit)

```
frontend/android/app/google-services.json
frontend/ios/App/App/GoogleService-Info.plist
backend/.env            (local)
Render env vars         (FIREBASE_*)
```
