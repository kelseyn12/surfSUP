# Scripts

| Script | Purpose |
|--------|--------|
| **patch-react-native-provider-template.js** | Patches RN codegen template so generated `RCTThirdPartyComponentsProvider` is nil-safe (run by `postinstall` and Podfile). |
| **patch-codegen-executor.js** | Patches codegen to emit a nil-safe provider (run by `postinstall` and Podfile). |
| **RCTThirdPartyComponentsProvider_safe.mm** | Nil-safe implementation; copied to codegen output by the Podfile on every `pod install` so the app never gets the crashing version. |
| **clean-rebuild-ios.sh** | Cleans iOS build artifacts (DerivedData, `ios/build`, Pods build). Run from project root. |
| **ios-fresh-run.sh** | Uninstalls the app from the booted simulator and runs `npx expo run:ios` (e.g. when “Available modules: none”). |
| **cleanup-duplicates.js** | Removes duplicate files with ` 2`-style suffixes in the project. |
| **reset-project.js** | Resets the project to a blank Expo state (`npm run reset-project`). |
