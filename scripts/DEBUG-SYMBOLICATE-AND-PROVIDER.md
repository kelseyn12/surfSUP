# Prove which binary is crashing (symbolication + where provider lives)

The crash is in `thirdPartyFabricComponents`; we need to know **which loaded image** (binary) that code lives in at runtime, and whether **surfSUP.debug.dylib** exists in the installed app and where the provider code actually is.

---

## Part A: Where does the provider code live in the installed app?

Run (from repo root, with simulator booted and app installed):

```bash
./scripts/where-provider-lives.sh
```

Or pass the .app path explicitly:

```bash
./scripts/where-provider-lives.sh "/Users/kelseynocek/Library/Developer/CoreSimulator/Devices/630118F4-EC40-4969-BCCD-4A3EB9A8B699/data/Containers/Bundle/Application/3ACE22CA-F88B-4976-9599-094E441E2082/surfSUP.app"
```

**Script does:**
- Lists all binaries in the .app (main executable + Frameworks/*.dylib, *.framework).
- Reports whether **surfSUP.debug.dylib** exists in the .app.
- For each binary: counts strings `thirdPartyFabricComponents`, `SURFSUP_PATCH`, `RNCSafeAreaProviderComponentView`.
- Lists which binary(ies) contain `thirdPartyFabricComponents` (the crash candidate).
- Uses `nm` to show which binary actually has the `thirdPartyFabricComponents` symbol (defines the code).

**Interpretation:**
- If the **main executable** (`surfSUP`) has the symbol and no `SURFSUP_PATCH`, the installed app is linking unpatched ReactCodegen.
- If **surfSUP.debug.dylib** appears in the .app and has the symbol, that’s the crashing image (if the stack says surfSUP.debug.dylib).
- If **surfSUP.debug.dylib is not in the .app** but the crash stack says `surfSUP.debug.dylib`, that dylib is being loaded from elsewhere (e.g. Xcode injects from DerivedData); the script confirms “provider lives in main exe on disk; crash may be from an injected image.”

---

## Part B: Symbolicate the crash to prove the crashing binary

Symbolication turns addresses in the crash log into symbols and **tells you which image (binary) each frame is in**.

### 1. Get a crash log

- **From Xcode:** Run the app, let it crash → Window → Organizer → Crashes, or open the report from the dialog.
- **From device/simulator:**  
  - Simulator: `~/Library/Logs/DiagnosticReports/` (look for `surfSUP` or your app name).  
  - Or: Xcode → Window → Organizer → Crashes.

Save the crash log as a `.crash` or `.txt` file (e.g. `crash.log`).

### 2. Symbolicate with Xcode

**Option A – atos (one frame at a time)**  
From the crash log you need:
- **Load address** of the crashing image (e.g. `surfSUP.debug.dylib` or your app binary). In the crash header you’ll see something like:
  `0x12345678 - 0x1234abcd surfSUP.debug.dylib`
- **Failing frame address** (e.g. `0x000000010ade5998` from the stack).

Then:

```bash
# Replace with the path to the binary that contains the code (from Part A).
BINARY="/path/to/surfSUP.app/surfSUP"   # or .../Frameworks/surfSUP.debug.dylib

# Load address = base address of that image from the crash log (first column in the "Binary Images" section).
LOAD_ADDR="0x100000000"   # example; use the actual value for the crashing image

# Failing instruction address from the stack (e.g. frame 4).
FRAME_ADDR="0x000000010ade5998"

atos -o "$BINARY" -l "$LOAD_ADDR" -arch arm64 "$FRAME_ADDR"
```

If the crash is on simulator (x86_64), use `-arch x86_64`. The output should show the symbol (e.g. `thirdPartyFabricComponents_block_invoke`).

**Option B – symbolicatecrash (full log)**  
Xcode ships a script that symbolicates a whole crash log:

```bash
export DEVELOPER_DIR=$(xcode-select -p)
/Applications/Xcode.app/Contents/SharedFrameworks/DUnit.framework/Resources/symbolicatecrash /path/to/crash.log -o crash_symbolicated.log
```

Or:

```bash
find /Applications/Xcode.app -name symbolicatecrash -type f 2>/dev/null | head -1
# Use that path:
symbolicatecrash /path/to/crash.log -o crash_symbolicated.log
```

Open `crash_symbolicated.log`: the “Binary Images” section lists every loaded image and its load address; the stack will show the image name next to each address (e.g. `surfSUP.debug.dylib` or `surfSUP`).

### 3. What to read from the symbolicated log

- **Failing frame** (e.g. frame 4): note the **library name** (e.g. `surfSUP.debug.dylib` or `surfSUP`). That is the **binary that is actually crashing**.
- **Binary Images:** find that library and its **load address range**. That’s the image that contains the unpatched provider at runtime.
- If that image is **not** inside your installed .app (e.g. it’s a path under DerivedData), then the running process is using a **different binary** than the one in the .app — e.g. Xcode-injected build.

---

## Part C: Tie it together

| Finding | Meaning |
|--------|--------|
| **surfSUP.debug.dylib not in .app**; crash stack says **surfSUP.debug.dylib** | Crash is from a binary **injected at runtime** (e.g. from Xcode/DerivedData), not from the installed .app. |
| **Provider symbol only in main exe** (`surfSUP`); no SURFSUP_PATCH in main exe | Installed app’s only copy of the provider is **unpatched**; that’s the one running when you launch from the simulator home screen. |
| **Provider symbol in a .dylib inside .app**; no SURFSUP_PATCH in that dylib | That .dylib in the .app is **unpatched**; fix the build so that dylib (or the main exe) gets the patched provider. |

After running `where-provider-lives.sh` and symbolication, you can state exactly which binary is crashing and whether it’s the one on disk in the .app or an injected image.
