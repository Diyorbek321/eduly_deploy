# Scholar Quest — Mobile Demo (Android)

A standalone Capacitor-based Android app containing **only** the Scholar Quest
(Gamifikatsiya) page from Eduly. Login is removed — it boots straight into the
demo.

## What's inside

- Vite + React 19 + Tailwind 4 (same stack as Eduly)
- Mobile-first layout: orange gradient header, tab switcher, 2-column reward
  grid, bottom-sheet modal, floating + button
- Capacitor 6 with Android platform added (`./android/`)
- No auth, no backend — all data is local/mocked

## Project layout

```
scholar-quest-mobile/
├── src/
│   ├── App.tsx        # the whole Scholar Quest screen
│   ├── main.tsx
│   └── index.css
├── dist/              # Vite build output (copied into the APK)
├── android/           # Capacitor Android project (open this in Android Studio)
├── capacitor.config.ts
└── package.json
```

## Develop in the browser

```bash
npm run dev
# open http://localhost:3000
```

Resize DevTools to a phone viewport to see the real layout.

## Build the Android APK

You need the Android SDK. Pick one:

### Option A — Android Studio (easiest)

1. Install Android Studio: https://developer.android.com/studio
2. From this folder, sync the web build into the Android project:
   ```bash
   npm run cap:sync
   ```
3. Open the `android/` folder in Android Studio.
4. Menu → **Build → Build Bundle(s)/APK(s) → Build APK(s)**.
5. APK appears at:
   `android/app/build/outputs/apk/debug/app-debug.apk`

### Option B — Command line only (no GUI)

```bash
# 1. Install the Android SDK command-line tools (Ubuntu/Debian):
sudo apt install android-sdk android-sdk-build-tools

# 2. Point gradle at the SDK:
export ANDROID_HOME=/usr/lib/android-sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin

# 3. Accept licenses (first time only):
yes | sdkmanager --licenses

# 4. Sync + build:
cd /home/diyorbek/Downloads/eduly\(11\)/scholar-quest-mobile
npm run cap:sync
cd android
./gradlew assembleDebug
```

APK will be at `android/app/build/outputs/apk/debug/app-debug.apk`.
Copy it to your phone and install (enable "Install unknown apps").

## Run directly on a connected device

```bash
# Phone must be in USB debug mode and visible to `adb devices`
npm run android:run
```

## Changing the app id or name

Edit `capacitor.config.ts`:

```ts
appId: 'com.eduly.scholarquest',
appName: 'Scholar Quest',
```

Then run `npm run cap:sync` to propagate the change into the Android project.
