#!/bin/bash
# Creates the LIFE FIT Google Play upload key, once.
#
#   bash scripts/android/create-upload-keystore.sh
#
# The keystore lives outside the repository and the password lives in the macOS
# Keychain, so neither can be committed. The password is typed here, by the
# owner, and is never printed or written to a file.
#
# It refuses to run when a keystore already exists: replacing the upload key
# after the first upload breaks every future update until Google resets it.
set -euo pipefail

KEY_DIR="${LIFE_FIT_SIGNING_DIR:-$HOME/Library/Application Support/LIFE FIT/Signing}"
KEYSTORE="$KEY_DIR/life-fit-upload.jks"
ALIAS="life-fit-upload"
KEYCHAIN_SERVICE="LIFE FIT Android upload keystore"
KEYTOOL="${JAVA_HOME:+$JAVA_HOME/bin/}keytool"

if [ -e "$KEYSTORE" ]; then
  echo "An upload keystore already exists at: $KEYSTORE"
  echo "Not creating another one."
  exit 1
fi
if security find-generic-password -s "$KEYCHAIN_SERVICE" -a "$ALIAS" >/dev/null 2>&1; then
  echo "A Keychain entry \"$KEYCHAIN_SERVICE\" already exists. Not overwriting it."
  exit 1
fi

echo "LIFE FIT - new Google Play upload key"
echo "Choose a strong password (at least 12 characters, no quotes or backslashes)."
echo "Nothing will be shown while you type."
while true; do
  read -r -s -p "Password: " PW1; echo
  read -r -s -p "Repeat password: " PW2; echo
  if [ "$PW1" != "$PW2" ]; then echo "The passwords do not match. Try again."; continue; fi
  if [ "${#PW1}" -lt 12 ]; then echo "Too short. Use at least 12 characters."; continue; fi
  case "$PW1" in *\"*|*\\*|*\'*) echo "Please avoid quotes and backslashes."; continue;; esac
  break
done
unset PW2

mkdir -p "$KEY_DIR"
chmod 700 "$KEY_DIR"

export LIFE_FIT_UPLOAD_KEYSTORE_PASSWORD="$PW1"
"$KEYTOOL" -genkeypair \
  -keystore "$KEYSTORE" -storetype PKCS12 \
  -alias "$ALIAS" -keyalg RSA -keysize 4096 -validity 10000 \
  -dname "CN=LIFE FIT, O=Eli Cohen Fitness, C=IL" \
  -storepass:env LIFE_FIT_UPLOAD_KEYSTORE_PASSWORD \
  -keypass:env LIFE_FIT_UPLOAD_KEYSTORE_PASSWORD >/dev/null
chmod 600 "$KEYSTORE"

# security -i reads the command from stdin, so the password never appears in
# the process list.
printf 'add-generic-password -s "%s" -a "%s" -l "%s" -w "%s"\n' \
  "$KEYCHAIN_SERVICE" "$ALIAS" "$KEYCHAIN_SERVICE" "$PW1" | security -i >/dev/null
unset PW1 LIFE_FIT_UPLOAD_KEYSTORE_PASSWORD

security find-generic-password -s "$KEYCHAIN_SERVICE" -a "$ALIAS" >/dev/null
echo
echo "Done. The upload key was created and its password was saved to your Keychain."
echo "Keystore: $KEYSTORE"
echo "Alias:    $ALIAS"
echo "You can close this window and go back to the chat."
