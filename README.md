# Click Click Boom

Playable browser prototype of the Android game concept. Open `index.html` directly; it embeds all scripts and sprites. Tap the red blob to build a surviving run. Each tap independently has a **1-in-20 explosion chance** (temporary test tuning). An exploding click counts toward lifetime taps but not your surviving score. Explosions reset the run, preserve your personal best, and leave puddles until you choose to restart. One million surviving clicks wins.

Progress is saved in browser local storage when available. Storage belongs to the current browser and file origin; it is not an account or cloud save. Global rankings and Android packaging are not implemented yet. Scores are local and untrusted.

Build after edits with `python3 build.py`. Run core gameplay checks with `node --test tests/game.test.js`. The editable UI source is `src/shell.html`; the independently testable rules are in `src/game.js`.
