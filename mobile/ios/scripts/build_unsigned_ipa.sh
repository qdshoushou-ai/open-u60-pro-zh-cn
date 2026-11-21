#!/bin/bash
# Build the OpenU60 iOS app without code signing (macOS + Xcode + XcodeGen required).
#
# Outputs (inside mobile/ios/OpenU60/):
#   OpenU60-unsigned.ipa     device build; sign it with your Apple ID (Sideloadly / AltStore / Xcode)
#   OpenU60-simulator.zip    app bundle for the iOS Simulator
#
# Usage:
#   ./scripts/build_unsigned_ipa.sh            # debug symbols off, Release config
#   ./scripts/build_unsigned_ipa.sh --debug    # Debug config
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../OpenU60" && pwd)"
cd "$PROJECT_ROOT"

CONFIG="Release"
if [[ "${1:-}" == "--debug" ]]; then
  CONFIG="Debug"
fi

if ! command -v xcodegen >/dev/null 2>&1; then
  echo "xcodegen not found. Install with: brew install xcodegen" >&2
  exit 1
fi

echo "▶ Generating Xcode project"
xcodegen generate

echo "▶ Building device app ($CONFIG, unsigned)"
xcodebuild \
  -project OpenU60.xcodeproj \
  -scheme OpenU60 \
  -configuration "$CONFIG" \
  -destination 'generic/platform=iOS' \
  -derivedDataPath build \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  build

APP=$(find "build/Build/Products/$CONFIG-iphoneos" -maxdepth 1 -name '*.app' | head -1)
if [[ -z "$APP" ]]; then
  echo "Could not locate the built .app" >&2
  exit 1
fi

echo "▶ Packaging unsigned IPA"
rm -rf Payload OpenU60-unsigned.ipa
mkdir -p Payload
cp -R "$APP" Payload/
zip -qry OpenU60-unsigned.ipa Payload
rm -rf Payload
ls -lh OpenU60-unsigned.ipa

echo "▶ Building simulator app (Debug, unsigned)"
xcodebuild \
  -project OpenU60.xcodeproj \
  -scheme OpenU60 \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath build-sim \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  build
SIM_APP=$(find build-sim/Build/Products/Debug-iphonesimulator -maxdepth 1 -name '*.app' | head -1)
ditto -c -k --sequesterRsrc --keepParent "$SIM_APP" OpenU60-simulator.zip
ls -lh OpenU60-simulator.zip

echo ""
echo "✔ Done:"
echo "  $PROJECT_ROOT/OpenU60-unsigned.ipa"
echo "  $PROJECT_ROOT/OpenU60-simulator.zip"
