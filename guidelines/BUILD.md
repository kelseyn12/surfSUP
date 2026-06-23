# SurfSUP — iOS dev build (clean + run)

Use this when Xcode gets stuck on **Planning build** or after native dependency changes.

## Prerequisites

- Xcode installed (open once to accept license)
- Node 18+ and `npm install` in `surfSUP/`
- CocoaPods (`pod --version`)

## Clean (full native reset)

From the project root (`surfSUP/`):

```bash
# Stop any running Metro / expo / xcodebuild
pkill -f "expo run:ios" 2>/dev/null || true
pkill -f "xcodebuild.*surfSUP" 2>/dev/null || true

# Local build artifacts
rm -rf ios/build ios/Pods

# Xcode cache for this app only
rm -rf ~/Library/Developer/Xcode/DerivedData/surfSUP-*

# Reinstall pods
cd ios && pod install && cd ..
```

`pod install` often takes 1–3 minutes (Firebase + RN = many pods).

## Run on simulator

```bash
unset CI   # CI=true disables Metro watch/reload in some environments
npx expo run:ios
```

First build after a clean can sit on **Planning build** for several minutes — normal for this stack.

## Run on device

1. Open `ios/surfSUP.xcworkspace` in Xcode (not `.xcodeproj`).
2. Select your team under **Signing & Capabilities**.
3. Choose your device, then **Product → Run**.

Or: `npx expo run:ios --device`

## EAS (TestFlight / store)

```bash
npx eas build --profile development --platform ios
```

Profiles are in `eas.json` (`development`, `preview`, `production`).

## Common issues

| Symptom | Try |
|--------|-----|
| Stuck on Planning build, 0% CPU for 15+ min | Kill build, run clean steps above |
| Watchman errors | `watchman watch-del-all` or ignore if Metro still starts |
| Pod install fails | `cd ios && pod deintegrate && pod install` |
| Firebase / native module missing | Rebuild dev client: `npx expo run:ios` (not Expo Go) |

## Env

Copy `.env` from team docs. Required: Firebase `EXPO_PUBLIC_FIREBASE_*`, Google/Apple client IDs if using social login. `EXPO_PUBLIC_WINDY_API_KEY` is **unused** — safe to remove.
