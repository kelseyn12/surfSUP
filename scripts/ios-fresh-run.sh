#!/usr/bin/env bash
# Uninstall the app from the booted simulator and run a fresh iOS build.
# Use this when "Available modules: none" (e.g. react-native-maps) to ensure
# you're not launching a stale or wrong build.
set -euo pipefail

BUNDLE_ID="${1:-com.kelseyn12.surfsupnative}"

echo "[ios-fresh-run] Checking for booted simulator..."
UDID=$(xcrun simctl list devices booted 2>/dev/null | grep -oE '[0-9A-F-]{36}' | head -n 1)
if [[ -z "$UDID" ]]; then
  echo "[ios-fresh-run] No booted simulator. Booting first available iPhone..."
  UDID=$(xcrun simctl list devices available 2>/dev/null | grep -i "iphone" | grep -oE '[0-9A-F-]{36}' | head -n 1)
  if [[ -z "$UDID" ]]; then
    echo "[ios-fresh-run] ERROR: No available iPhone simulator."
    exit 1
  fi
  xcrun simctl boot "$UDID" 2>/dev/null || true
  sleep 2
fi

echo "[ios-fresh-run] Uninstalling existing app (bundle: $BUNDLE_ID) from simulator $UDID..."
xcrun simctl uninstall "$UDID" "$BUNDLE_ID" 2>/dev/null || true

echo "[ios-fresh-run] Running fresh build and install (from project root)..."
cd "$(dirname "$0")/.."
exec npx expo run:ios
