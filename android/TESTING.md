# Android testing

The direct-install APK is a **debug build with local gameplay and native test-ad/Play integrations**. The signed Play AAB is a release build for internal testing (see below). Both wrap the same bundled game used by the website in a native Android Activity. Minimum Android version: **8.0 (API 26)**. Target: **Android 16 (API 36)**.

## Install on a phone

Download the `squish-squish-splat-android-debug` artifact from the repository's **Actions → Build Android APK and Play AAB** workflow, unzip it, and open `app-debug.apk` on your Android device. Allow installation from your browser or file manager when Android asks. The test app is named **Squish Squish Splat**, with package ID `com.shootyq.clickclickboom.debug`.

Alternatively, enable Developer options and USB debugging, connect the device, then run:

```sh
adb devices
adb install -r app-debug.apk
adb shell am start -n com.shootyq.clickclickboom.debug/com.shootyq.clickclickboom.MainActivity
```

Debug keys can differ between local builds and fresh CI runners. If Android reports `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, uninstall the old debug app before installing. **Uninstalling clears its local progress.** The Play release uses the existing stable upload signing key and application ID `com.squishsquishsplat.myapp`.

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

The Gradle asset task packages **`dist/`**, including its small entry page and separate images/audio; rebuild it with `python3 build.py` after changing stories, dialogue, or JavaScript. Android loads `https://appassets.androidplatform.net/assets/index.html` through a local asset loader, preserving the existing localStorage origin. It does not copy the legacy standalone base64 HTML into Java memory or download content from the website. Existing browser saves do not transfer to the Android app.

CI builds the Android instrumentation APK and launches Android 15/API 35 and Android 16/API 36 emulators. The startup test must find the rendered game title, full logo, native store bridge, and all three decoded SFX buffers. To run it with a connected emulator or phone locally: `./gradlew connectedDebugAndroidTest` from `android/`.

## Phone checks

- Open the app offline: menu and animated blob load without a connection.
- Play, tap a few times, return to the menu, and choose **Continue run**.
- Open **Stats** and confirm personal best, current run, lifetime taps, and explosions.
- Close the app fully and reopen; confirm the surviving run and story bookmark remain.
- Use both Android Back gestures/buttons and in-app menu buttons. Back returns to the menu, then leaves the app from the menu.
- Rotate the device and background/resume the app. Confirm progress remains and controls avoid the status bar, camera cutout, and navigation bar.
- Continue until an explosion: puddles remain, score resets, and restarting resumes the same story beat, including after closing/reopening the app while dead.
- Open **Remove Ads**: the test build clearly states purchases are unavailable, shows no ads, and never launches a payment prompt.

There is no billing SDK, AdMob integration, or online leaderboard in this version. Remove Ads is a navigation and information screen; purchase and restore entitlement behavior requires the later Google Play Billing integration. Statistics and scores are local, not server-validated. Debug APKs use debug signing and allow WebView inspection through Chrome's `chrome://inspect` with USB debugging enabled; the Play AAB uses the dedicated upload key and disables that inspection.

For Play testing, use the signed AAB below and complete the Console setup items, store information, and privacy/data-safety declarations requested for the account. Ad units and billing products will be needed when those features are implemented. Installing an APK directly does not publish to Google Play.

## Google Play internal testing: signed AAB

Use a **signed release `.aab`** for Play Console's Internal testing track. The debug APK is for direct installation and is a separate app. The Play application ID is **`com.squishsquishsplat.myapp`**; the original debug ID is retained for existing sideloaded saves. Release builds disable WebView debugging. The Play and debug apps have separate local progress.

A dedicated upload key has been created for this new app and kept outside the repository. Retain its private backup; it contains the encrypted keystore and its passwords. Never commit the backup, upload it as a public Actions artifact, or share its contents in chat. Google Play App Signing manages the app-signing key; our key signs uploads. The first signed AAB registers the upload identity when you enroll the app.

To build a signed bundle locally, securely supply these environment variables and run `./gradlew bundleRelease lintRelease` in `android/`:

- `SPLAT_UPLOAD_STORE_FILE`: path to `upload-keystore.p12`.
- `SPLAT_UPLOAD_STORE_PASSWORD`: keystore password.
- `SPLAT_UPLOAD_KEY_ALIAS`: upload alias.
- `SPLAT_UPLOAD_KEY_PASSWORD`: key password.

Bundle output: `android/app/build/outputs/bundle/release/app-release.aab`. With no signing variables, Gradle can compile an unsigned bundle for validation; **that output cannot be uploaded to Play**. Partial signing configuration fails explicitly.

For repeatable signed bundles in GitHub Actions, enter the four entries from the private backup's `github-actions-secrets.json` into **repository Settings → Secrets and variables → Actions**. These are `SPLAT_UPLOAD_KEYSTORE_BASE64`, `SPLAT_UPLOAD_STORE_PASSWORD`, `SPLAT_UPLOAD_KEY_ALIAS`, and `SPLAT_UPLOAD_KEY_PASSWORD`. Values belong in secret fields, never in workflow source. CI publishes `squish-squish-splat-play-internal` only when signing is configured, and deletes its temporary keystore afterward. Without secrets it publishes only the debug APK, while still compiling/linting the release variant.

In Play Console, create the new app, open **Testing → Internal testing**, create a release, enroll in Play App Signing, and upload the signed AAB. Add testers and provide them the opt-in link after you roll out the internal release. Complete any setup items Play Console requires for this account. This work prepares files; it does not create a Console app or upload/roll out a release. Increase `versionCode` for each subsequent upload.

## Ads and billing

See [MONETIZATION.md](MONETIZATION.md). Test IDs are the default, and purchasing stays disabled until the Play public key and one-time product are configured. The native SDKs use the network, while the game assets and statistics remain local. Use a Play license-test account to verify checkout; internal-track access alone does not prevent real charges.

- Music: confirm Slimey Breeze → Slimey Breezy Day → Squish Squish 3 → Slimey Breeze. On explosion, The Last Squirt starts immediately and loops until Menu or New Game. Confirm no overlap, Music/mute controls affect both music modes, SFX volume does not mute the song, and background/resume keeps the correct mode.

## System bars and safe areas

The Activity uses AndroidX `EdgeToEdge.enable()` with dark system-bar icons over the cream background. `WindowInsetsCompat` reserves the union of system bars and display cutouts once around the native banner and WebView. Rotation replaces the padding rather than adding to it. App code does not call the deprecated framework system-bar color, visibility or inset-consumption APIs directly.

`EdgeToEdgeTest` checks native bounds and visible HTML controls in portrait and landscape with 0, 50 and 90 dp native banner reservations. CI runs it with a simulated tall camera cutout under both gesture and three-button navigation, on Android 15 and 16. Native screenshots and test logs are retained in the per-API startup-result artifacts. Reservations are created only by instrumentation; they do not load or fabricate ad impressions.

The app selects supported AndroidX Fragment 1.9.1 through a dependency constraint, upgrading the old 1.1.0 requested by Google Play Services. Activity 1.13.0 and Core 1.18.0 support the existing compile SDK 36 toolchain. After uploading a new AAB, check Play Console's report for that version; historical reports for earlier releases remain separate.
