# Illustrated UI assets

Generated specifically for Squish Squish Splat: a transparent illustrated logo and a three-row transparent button atlas. Original generated files remain in `/workspace/generated_images` in the development workspace.

- `logo.png`: 1536 × 1024. Used as the accessible title-screen logo.
- `menu-buttons.png`: 1536 × 1024, three equally sized rows: jelly-red Play, mustard Stats ticket, ivory Remove Ads heart. Labels remain HTML text for accessibility and Play/Continue changes. CSS uses `background-size: 100% 300%` with top, middle, and bottom positions.
- `game-panel.png`: illustrated parchment frame with jelly corner details. Nine-slice borders carry the same artwork into the gameplay score plaque, speech panels, and stat cards while allowing text and colors to change.

`build.py` embeds the artwork in the legacy standalone preview and includes the original PNG files beside a small entry page in `dist/`. Android's offline asset loader and the website load those separate files instead of duplicating base64 artwork inside HTML. `src/style.css` is shared by both formats.
