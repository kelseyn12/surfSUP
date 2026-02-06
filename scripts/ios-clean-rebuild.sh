#!/bin/bash
# Full clean + pod install + ready for rebuild.
# Run from project root: ./scripts/ios-clean-rebuild.sh
# Then: npx expo run:ios (or open ios/surfSUP.xcworkspace and build).

set -e
cd "$(dirname "$0")/.."

echo "Cleaning Xcode DerivedData..."
rm -rf ~/Library/Developer/Xcode/DerivedData/*

echo "Cleaning ios/build and Pods..."
rm -rf ios/build
rm -rf ios/Pods
rm -f ios/Podfile.lock

echo "Running pod install (codegen + patch will run)..."
cd ios && pod install && cd ..

echo "Done. Run: npx expo run:ios"
