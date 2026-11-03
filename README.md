# Squish Squish Splat

The home menu has Play/Continue, device statistics, and a Remove Ads screen. Android includes native banner ads, consent, and Play Billing; unconfigured builds use test ad IDs and disable checkout. Back/Escape returns to the menu without resetting a run.

The UI uses custom illustrated logo/button assets from `assets/ui/` and paper-and-ink styling in `src/style.css`. Story dialogue displays its title and a Story time label. Milestone asides show a yellow Quick interruption card over the paused story line; the next eligible tap replays that line with a green Back to the story cue. Death and victory have distinct states, and a new run clears the interruption display. Reduced-motion preferences disable decorative transitions and idle sprite loops.

The supplied WAV files in `assets/audio/` are embedded in both the standalone web page and Android app. Surviving taps play `tap.wav`; explosions play `exploding.wav` at the flash frame (260 ms) and `explosionlanding.wav` at the falling/landing frame (520 ms). Sound defaults on, unlocks after a user gesture, and has a saved toggle available on every screen. Muting, leaving gameplay, restarting, or hiding the page cancels active and scheduled sounds. Rapid-tap overlap is bounded to six voices with a peak compressor. If audio is unsupported, gameplay still works silently. Reloading a dead run does not replay its explosion.

Music is bundled offline from `assets/music/`. Every launch starts the playlist with **Slimey Breeze**, followed by **Slimey Breezy Day**, then repeats in that order. Music starts after a user gesture, continues across menus and run resets, and pauses in the background. **Music & sound effects** opens independently saved 0–100% sliders (defaults: music 35%, SFX 65%). Zero pauses/mutes that channel; the existing Sound toggle mutes both without changing the saved slider levels. Music uses a media element through its own Web Audio gain node, so long tracks are not decoded into full-length PCM buffers at startup. Android lifecycle callbacks also pause/resume music.

For an installable Android test app with offline gameplay and a Play internal-testing bundle, see [Android testing](android/TESTING.md). GitHub Actions builds a debug APK on pushes to `main` and publishes a signed Play AAB when upload-signing secrets are configured. Android compilation and lint run independently of the Pages deployment.

Playable browser prototype of the Android game concept. Open `index.html` directly; it embeds all scripts and sprites. Tap the red blob to build a surviving run. The goal is **50,000 surviving clicks**, with a **1-in-5,000,000 probability of finishing a fresh run**. Each tap has the same independent explosion probability, calculated as `-expm1(-log(5000000) / 50000)` (about 1 in 3,242 taps). This is a single hardcore mode. An exploding click counts toward lifetime taps but not your surviving score. Explosions reset the run, preserve your personal best, and leave puddles until you choose to restart. Fifty thousand surviving clicks wins.

Progress is saved in browser local storage when available. Storage belongs to the current browser and file origin; it is not an account or cloud save. There are no global rankings or accounts. Scores are local.

Build after edits with `python3 build.py`. Run core gameplay checks with `node --test tests/game.test.js`. The editable UI source is `src/shell.html`; the independently testable rules are in `src/game.js`.

Stories live in `stories/*.md`: a title heading followed by blank-line-separated dialogue beats. The build embeds every story as structured data with beat IDs and reading delays, so the deployed game needs no extra requests. Add a story file and rebuild to expand the catalog. Run `node tests/story.test.js` for story playback checks.

A new run chooses a random story at its opening. Reaching the end selects another story (excluding the current one when possible). With just one story, it restarts. Surviving runs retain their bookmark across reloads. Explosions erase the story bookmark along with the run; the next run selects a story from the beginning. Personal best and lifetime stats remain. Milestone interruptions keep the current bookmark and replay that beat after the interruption. Rapid taps score normally but do not skip unread dialogue or queue text.

`content/milestones.json` contains 50 milestone numbers with ten individually written reactions each. Milestones at 100 or below roll a 1-in-7 speaking chance each time reached; higher milestones speak when the dialogue channel is available. Reactions do not replace an active interruption and have a 4.5-second cooldown. Missed milestones are dropped, never queued. After a comment, the interrupted story beat is replayed in full on the next eligible tap. The previous spoken variant for each milestone is saved across runs and excluded from the next selection. Explosions always take priority; the 50,000-click win always gets its own reaction. Run `node tests/milestones.test.js` to validate content and selection rules.

The display name is **Squish Squish Splat**. The original debug Android package ID and browser storage key are retained so existing test installs and saved progress continue working. The Play release uses `com.squishsquishsplat.myapp`; its signed AAB is intended for Play Console internal testing. The GitHub repository and Pages URL stay at their existing addresses. See `android/TESTING.md` for upload signing and CI secrets.

`python3 build.py` produces two formats: the legacy standalone `index.html`, and a lightweight `dist/index.html` with separate PNG/WAV/MP3 files. GitHub Pages and Android use **dist/**. Android streams those packaged files via `WebViewAssetLoader` at the existing save origin; it does not read the standalone base64 HTML into the Java heap. Build tests enforce a startup-page size below 1 MiB and verify every asset reference. Android CI launches an API 36 emulator and must reach the menu with the logo and SFX decoded.

### Mobile layout

Screens fit the viewport with safe-area padding and a reserved 50 px top banner. `window.setAdBannerHeight(height)` adjusts the browser reservation (0–120 px). Android allocates its native adaptive banner above the WebView and sets the HTML reservation to zero. Audio settings open from the music-note button without shifting the game. Local Patrick Hand and Lilita One fonts and their OFL licenses are bundled in `assets/fonts/`.

After `python3 build.py`, run `node tests/mobile-layout.cjs` with Playwright installed (or set `PLAYWRIGHT_MODULE` to its module path). Set `CHROMIUM_PATH` if needed. This checks all screens, long story text, interruptions, restart controls, and audio controls across seven portrait/landscape sizes with 50 px and 90 px banner reservations.

### Ads and purchases

Android now includes a native adaptive banner, Google UMP consent/privacy options, and a one-time `remove_ads` Play Billing flow with restoration. Unconfigured builds use Google test ad IDs and disable checkout; the browser preview has no purchasing. See [Android monetization setup](android/MONETIZATION.md) for AdMob IDs, Play product/public-key configuration, license testing, and launch checks. Gameplay and statistics remain local.

Run `node tests/store.test.js` for the purchase UI adapter and `node tests/native-store-ui.cjs` with Playwright for the native store states, privacy controls, and banner-reduced viewport checks. Receipt signature tests run with `./gradlew testDebugUnitTest` in `android/`.
