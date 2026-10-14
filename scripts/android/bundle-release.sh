#!/bin/bash
# Builds the signed LIFE FIT Android App Bundle for Google Play.
#
#   bash scripts/android/bundle-release.sh
#
# The shell loads the production site, so the bundle is pointed at it here and
# nowhere else. The upload keystore lives outside the repository and its
# password comes from the macOS Keychain (see create-upload-keystore.sh); both
# reach Gradle only through this process's environment.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TOOLS="${LIFE_FIT_TOOLS_DIR:-$HOME/start/.tools}"
export JAVA_HOME="${JAVA_HOME:-$TOOLS/jdk-21.0.12.1+1/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-$TOOLS/android-sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export GRADLE_USER_HOME="${GRADLE_USER_HOME:-$TOOLS/../.gradle-user}"

KEY_DIR="${LIFE_FIT_SIGNING_DIR:-$HOME/Library/Application Support/LIFE FIT/Signing}"
export LIFE_FIT_UPLOAD_KEYSTORE="$KEY_DIR/life-fit-upload.jks"
export LIFE_FIT_UPLOAD_KEY_ALIAS="life-fit-upload"
if [ ! -f "$LIFE_FIT_UPLOAD_KEYSTORE" ]; then
  echo "No upload keystore at $LIFE_FIT_UPLOAD_KEYSTORE" >&2
  exit 1
fi
LIFE_FIT_UPLOAD_KEYSTORE_PASSWORD="$(security find-generic-password -s "LIFE FIT Android upload keystore" -a "$LIFE_FIT_UPLOAD_KEY_ALIAS" -w)"
export LIFE_FIT_UPLOAD_KEYSTORE_PASSWORD

cd "$ROOT"
START_NATIVE_SERVER_URL="https://start.elicohenfitness.co.il" npx cap sync android
cd android
./gradlew --no-daemon clean bundleRelease

AAB="$ROOT/android/app/build/outputs/bundle/release/app-release.aab"
"$JAVA_HOME/bin/jarsigner" -verify "$AAB" >/dev/null
echo "Signed bundle: $AAB"
