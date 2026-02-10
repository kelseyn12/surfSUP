#!/bin/bash
# Full clean rebuild for iOS: removes DerivedData, Pods build artifacts, and iOS build directory.
# Usage: ./scripts/clean-rebuild-ios.sh

set -e

PROJECT_NAME="surfSUP"
IOS_DIR="$(cd "$(dirname "$0")/../ios" && pwd)"

echo "🧹 Cleaning iOS build artifacts..."

# 1. Delete DerivedData for this project
echo "Deleting DerivedData for $PROJECT_NAME..."
find ~/Library/Developer/Xcode/DerivedData -name "${PROJECT_NAME}-*" -type d -exec rm -rf {} + 2>/dev/null || true

# 2. Delete iOS build directory
echo "Deleting ios/build..."
rm -rf "$IOS_DIR/build" 2>/dev/null || true

# 3. Delete Pods build artifacts (but keep Pods directory for faster pod install)
echo "Deleting Pods build artifacts..."
rm -rf "$IOS_DIR/Pods/build" 2>/dev/null || true
find "$IOS_DIR/Pods" -name "*.xccheckout" -delete 2>/dev/null || true

# 4. Delete Podfile.lock (optional - uncomment if you want a fresh pod install)
# rm -f "$IOS_DIR/Podfile.lock"

echo "✅ Clean complete!"
echo ""
echo "Next steps:"
echo "  1. cd ios && pod install"
echo "  2. npx expo run:ios"
echo ""
echo "Or run: cd ios && pod install && cd .. && npx expo run:ios"
