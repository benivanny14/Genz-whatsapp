#!/bin/bash
# ═══════════════════════════════════════════════════════
# Genz Messenger — APK Signing Key Generator
# ═══════════════════════════════════════════════════════
# Run this ONCE to create your release signing key.
# Then configure Android Studio to use it for signed builds.
#
# Usage:
#   cd frontend/android
#   bash create-signing-key.sh
#
# After creating, add to android/app/build.gradle:
#   signingConfigs {
#     release {
#       storeFile file("genz-release.jks")
#       storePassword "YOUR_PASSWORD"
#       keyAlias "genz"
#       keyPassword "YOUR_PASSWORD"
#     }
#   }
# ═══════════════════════════════════════════════════════

set -e

KEYSTORE_FILE="genz-release.jks"
KEY_ALIAS="genz"
VALIDITY=10000  # ~27 years

echo "╔══════════════════════════════════════╗"
echo "║  Genz Messenger — Signing Key Gen    ║"
echo "╚══════════════════════════════════════╝"
echo ""

if [ -f "$KEYSTORE_FILE" ]; then
  echo "⚠️  $KEYSTORE_FILE already exists!"
  echo "   Delete it first if you want to create a new one."
  exit 1
fi

echo "Creating release signing key..."
echo "You'll be prompted for a password — REMEMBER IT!"
echo ""

keytool -genkeypair \
  -v \
  -keystore "$KEYSTORE_FILE" \
  -keyalg RSA \
  -keysize 2048 \
  -validity $VALIDITY \
  -alias "$KEY_ALIAS"

echo ""
echo "✅ Signing key created: $KEYSTORE_FILE"
echo ""
echo "Next steps:"
echo "1. Open Android Studio"
echo "2. Build → Generate Signed Bundle / APK"
echo "3. Choose APK → Use existing key → $KEYSTORE_FILE"
echo "4. Enter the password you just set"
echo "5. Release build will be signed!"
echo ""
echo "⚠️  IMPORTANT: Keep $KEYSTORE_FILE SAFE!"
echo "   - Never commit it to git"
echo "   - Back it up to a secure location"
echo "   - Same key = same app identity on Play Store"
