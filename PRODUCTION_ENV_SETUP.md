# Production Environment Variables Setup Guide

## Overview
This guide explains how to configure the required environment variables for the GENZ WhatsApp backend to enable push notifications and other features in production (Render/your server).

## Required Environment Variables

### Firebase Configuration (FCM Push Notifications)

These variables are required for Firebase Cloud Messaging to work. Without them, the backend will report "Firebase not initialized" and push notifications will not be sent.

```
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
```

**How to get these values:**
1. Go to [Firebase Console → Project Settings → Service Accounts](https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk)
2. Click "Generate New Private Key"
3. Download the JSON file
4. Extract the values:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (include the entire key with newlines)

### VAPID Keys (Web Push Notifications)

These are required for web push notifications (browser-based push).

```
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
```

**How to generate VAPID keys:**
```bash
# Using Node.js
npx web-push generate-vapid-keys
```

Or use an online VAPID key generator.

### Other Required Variables

```
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret-key
NODE_ENV=production
PORT=5000
```

## Setting Environment Variables on Render

1. Go to your Render dashboard
2. Select your backend service
3. Go to "Environment" tab
4. Add each variable:
   - Click "Add Environment Variable"
   - Enter the key (e.g., `FIREBASE_PROJECT_ID`)
   - Enter the value
   - Click "Save"

5. After adding all variables, deploy your service

## Setting Environment Variables Locally (Testing)

Create a `.env` file in the backend directory:

```env
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
MONGODB_URI=mongodb://localhost:27017/genz-whatsapp
JWT_SECRET=your-jwt-secret-key
NODE_ENV=development
PORT=5000
```

## Important Notes

### FIREBASE_PRIVATE_KEY Format
The private key must include the newlines (`\n`) exactly as they appear in the JSON file. If you're setting this in Render:
- Copy the entire private key value from the JSON file
- Paste it as-is (Render will handle the formatting)
- Do not remove the `-----BEGIN PRIVATE KEY-----` or `-----END PRIVATE KEY-----` parts

### Security
- Never commit `.env` files to version control
- Never share your private keys or secrets
- Rotate keys if they are accidentally exposed
- Use different secrets for development and production

### Verification

After setting up environment variables, verify they are working:

1. Check backend logs for "Firebase not initialized" errors
2. If you see this error, double-check that all Firebase variables are set correctly
3. Test push notifications by sending a message while the recipient is offline

## Troubleshooting

### "Firebase not initialized" Error
- Verify `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` are all set
- Check that the private key format is correct (includes newlines)
- Ensure the service account email has proper Firebase permissions

### Push Notifications Not Working
- Check backend logs for Firebase-related errors
- Verify the FCM token is being registered (check `registerPushToken` in frontend logs)
- Ensure the device has Google Play Services installed (Android)
- Test with the app completely closed (swipe from recent apps)

### VAPID Errors
- Regenerate VAPID keys if you suspect they are corrupted
- Ensure both public and private keys are set
- Check that the keys match (generated together)
