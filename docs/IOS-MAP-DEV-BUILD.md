# iOS Map: Development Build Required

react-native-maps is a **native module**. It is only available in a **development build** (the app you get from `npx expo run:ios`), not in Expo Go.

## If you see "Available modules: none"

You are likely running a **stale or wrong build** (e.g. an old install on the simulator, or a build that didn’t include the native module).

### Fix: uninstall and run a fresh build

From the project root:

```bash
chmod +x scripts/ios-fresh-run.sh
./scripts/ios-fresh-run.sh
```

This will:

1. Uninstall the existing app from the booted simulator.
2. Run `npx expo run:ios` so a new build is installed and launched.

### Manual steps

1. In the simulator: long-press the app icon → Remove App → Delete App.
2. In the project root: `npx expo run:ios`.

Ensure you **run the app from the terminal/Xcode run** after the build, not by tapping an old icon. The build that includes react-native-maps is the one produced by `npx expo run:ios` (or by opening `ios/surfSUP.xcworkspace` in Xcode and building the **surfSUP** scheme).

## Provider patch (separate)

RCTThirdPartyComponentsProvider is patched in the Podfile post-install; the compiled provider .o is verified with `./scripts/verify-provider-in-dylib.sh`. That is unrelated to the map module; the map simply requires a correct, up-to-date dev build.
