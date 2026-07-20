# Firebase Setup Guide

## Overview
This guide explains how to set up Firebase Cloud Messaging (FCM) for push notifications in the GENZ WhatsApp application.

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select existing project
3. Enter project name (e.g., "genz-whatsapp")
4. Follow the setup wizard

## Step 2: Add Android App

1. In Firebase Console, click the Android icon (🤖) to add an Android app
2. **Package Name**: Enter `com.benivanny.genzwhatsapp`
3. **App Nickname**: Enter "GENZ WhatsApp" (optional)
4. Click "Register app"

## Step 3: Download google-services.json

1. After registering, you'll see a download button for `google-services.json`
2. Download the file
3. Place it in: `frontend/android/app/google-services.json`

**Important**: This file is required for the APK to obtain FCM tokens. Without it, push notifications will not work.

## Step 4: Configure Firebase in Android

The following configurations should already be in place, but verify:

### frontend/android/app/build.gradle
```gradle
apply plugin: 'com.google.gms.google-services'

dependencies {
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-messaging'
}
```

### frontend/android/build.gradle (root)
```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

## Step 5: Generate Service Account Key for Backend

1. Go to [Firebase Console → Project Settings](https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk)
2. Click "Generate New Private Key"
3. Save the JSON file (keep it secure!)
4. You'll need these values from the JSON file:
   - `project_id`
   - `client_email`
   - `private_key`

## Step 6: Build and Test

After setting up Firebase:

1. Sync Capacitor with Android:
```bash
cd frontend
npx cap sync android
```

2. Build the APK:
```bash
npx cap build android
```

3. Install the APK on your device

4. Test push notifications:
   - Close the app completely (swipe from recent apps)
   - Have another user send you a message or call
   - You should receive a notification/ring even with the app closed

## Troubleshooting

### No FCM Token Generated
- Verify `google-services.json` is in the correct location
- Check that the package name matches exactly: `com.benivanny.genzwhatsapp`
- Ensure the app has internet permissions

### Push Notifications Not Received
- Check backend logs for "Firebase not initialized" errors
- Verify environment variables are set (see PRODUCTION_ENV_SETUP.md)
- Ensure the device has Google Play Services installed

### "Firebase not initialized" Error
This means the backend Firebase configuration is missing. Set the required environment variables:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

See PRODUCTION_ENV_SETUP.md for details.
