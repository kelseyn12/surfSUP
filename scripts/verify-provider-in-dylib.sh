#!/usr/bin/env bash
set -euo pipefail

BUNDLE_ID="${1:-com.kelseyn12.surfsupnative}"

APP="$(xcrun simctl get_app_container booted "$BUNDLE_ID" app)"
echo "APP=$APP"

DYLIB="$APP/surfSUP.debug.dylib"
echo "DYLIB=$DYLIB"

echo "=== checking provider compilation unit (.o file) ==="
OBJ="$(find "$HOME/Library/Developer/Xcode/DerivedData" \
  -path "*ReactCodegen.build*Objects-normal*RCTThirdPartyComponentsProvider.o" | head -n 1)"

if [[ -z "$OBJ" || ! -f "$OBJ" ]]; then
  echo "ERROR: Could not find RCTThirdPartyComponentsProvider.o in DerivedData"
  exit 1
fi

echo "OBJ=$OBJ"

bad_in_obj="$(strings "$OBJ" | grep -c "dictionaryWithObjects:forKeys:count:" || true)"
marker_in_obj="$(strings "$OBJ" | grep -c "SURFSUP_PATCH" || true)"

echo "dictionaryWithObjects:forKeys:count: count=$bad_in_obj"
echo "SURFSUP_PATCH count=$marker_in_obj"

if [[ "$bad_in_obj" -ne 0 ]]; then
  echo "ERROR: provider.o still references dictionaryWithObjects:forKeys:count:"
  exit 1
fi

if [[ "$marker_in_obj" -lt 1 ]]; then
  echo "ERROR: provider.o missing SURFSUP_PATCH marker"
  exit 1
fi

echo "✅ Provider .o file is safe (no dictionaryWithObjects, has marker)"

echo ""
echo "=== informational: dylib-wide selector strings (may include other code) ==="
DICT_COUNT_DYLIB=$(strings -a "$DYLIB" | grep -F "dictionaryWithObjects:forKeys:count:" | wc -l | tr -d ' ')
PATCH_COUNT_DYLIB=$(strings -a "$DYLIB" | grep -F "SURFSUP_PATCH" | wc -l | tr -d ' ')
echo "dylib dictionaryWithObjects:forKeys:count: count=$DICT_COUNT_DYLIB (informational, may include other code)"
echo "dylib SURFSUP_PATCH count=$PATCH_COUNT_DYLIB (informational)"

echo ""
echo "=== provider-related strings in dylib (first 120 matches, informational) ==="
(strings -a "$DYLIB" | grep -E "thirdPartyFabricComponents|RCTThirdPartyComponentsProvider|RNCSafeAreaProvider|dictionaryWithObjects:forKeys:count:|NSMutableDictionary|setObject:_c|SURFSUP_PATCH" || true) | head -n 120
