# Click Click Boom

Playable browser prototype of the Android game concept. Open `index.html` directly; it embeds all scripts and sprites. Tap the red blob to build a surviving run. Each tap independently has a **1-in-20 explosion chance** (temporary test tuning). An exploding click counts toward lifetime taps but not your surviving score. Explosions reset the run, preserve your personal best, and leave puddles until you choose to restart. One million surviving clicks wins.

Progress is saved in browser local storage when available. Storage belongs to the current browser and file origin; it is not an account or cloud save. Global rankings and Android packaging are not implemented yet. Scores are local and untrusted.

Build after edits with `python3 build.py`. Run core gameplay checks with `node --test tests/game.test.js`. The editable UI source is `src/shell.html`; the independently testable rules are in `src/game.js`.

Stories live in `stories/*.md`: a title heading followed by blank-line-separated dialogue beats. The build embeds every story as structured data with beat IDs and reading delays, so the deployed game needs no extra requests. Add a story file and rebuild to expand the catalog. Run `node tests/story.test.js` for story playback checks.

A new run chooses a random story at its opening. Reaching the end selects another story (excluding the current one when possible). With just one story, it restarts. Surviving runs retain their bookmark across reloads. Explosions erase the story bookmark along with the run; the next run selects a story from the beginning. Personal best and lifetime stats remain. Milestone interruptions keep the current bookmark and replay that beat after the interruption. Rapid taps score normally but do not skip unread dialogue or queue text.
