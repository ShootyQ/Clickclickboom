# Android testing

This is an **offline debug build**, not a Google Play release. It wraps the same bundled game used by the website in a native Android Activity. Minimum Android version: **8.0 (API 26)**. Target: **Android 16 (API 36)**.

## Install on a phone

Download the `squish-squish-splat-android-debug` artifact from the repository's **Actions → Build Android test APK** workflow, unzip it, and open `app-debug.apk` on your Android device. Allow installation from your browser or file manager when Android asks. The test app is named **Squish Squish Splat**, with package ID `com.shootyq.clickclickboom.debug`.

Alternatively, enable Developer options and USB debugging, connect the device, then run:

```sh
adb devices
adb install -r app-debug.apk
adb shell am start -n com.shootyq.clickclickboom.debug/com.shootyq.clickclickboom.MainActivity
```

Debug keys can differ between local builds and fresh CI runners. If Android reports `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, uninstall the old debug app before installing. **Uninstalling clears its local progress.** A Play release will need a stable signing identity and an approved final application ID.

## Build locally

Install JDK 21, Android SDK platform 36, build-tools 36.0.0, and Gradle 8.13 (or use the included Gradle wrapper). Set `ANDROID_HOME` to your SDK directory. From the repository root:

```sh
python3 build.py
node tests/game.test.js
node tests/story.test.js
node tests/milestones.test.js
cd android
./gradlew --no-daemon --max-workers=2 assembleDebug lintDebug
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`.

The Gradle asset task packages the generated `index.html`; rebuild the web bundle after changing stories, dialogue, or JavaScript. The app does not download content from the website. Existing browser saves do not transfer to the Android app.

## Phone checks

- Open the app offline: menu and animated blob load without a connection.
- Play, tap a few times, return to the menu, and choose **Continue run**.
- Open **Stats** and confirm personal best, current run, lifetime taps, and explosions.
- Close the app fully and reopen; confirm the surviving run and story bookmark remain.
- Use both Android Back gestures/buttons and in-app menu buttons. Back returns to the menu, then leaves the app from the menu.
- Rotate the device and background/resume the app. Confirm progress remains and controls avoid the status bar, camera cutout, and navigation bar.
- Continue until an explosion: puddles remain, score resets, and restarting begins a new story.
- Open **Remove Ads**: the test build clearly states purchases are unavailable, shows no ads, and never launches a payment prompt.

There is no billing SDK, AdMob integration, online leaderboard, or production signing in this build. Remove Ads is a navigation and information screen; purchase and restore entitlement behavior requires the later Google Play Billing integration. Statistics and scores are local, not server-validated. Debug builds allow WebView inspection through Chrome's `chrome://inspect` with USB debugging enabled.

Before Play testing, configure the final app ID, signing, store listing, privacy/data-safety declarations, and (when implemented) test ad units and billing products. Installing this APK directly does not publish to Google Play.
