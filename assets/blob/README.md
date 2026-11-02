# Blob animation assets

`blob-sprites-v3.png` is the current transparent RGBA atlas: 1536 × 1024 pixels, six columns and four rows of 256 × 256 cells. Read frames left to right, top to bottom (zero-based). Preserve each full cell for positioning. Original `blob-sprites.png` is retained as the previous version.

| Animation | Frames | Frame duration |
| --- | --- | --- |
| Idle breathing and blink | 0–5 | 150 ms |
| Tap squash and rebound | 6–11 | 65 ms |
| Nervous sway | 12,13,14,13,15,16,15,17 | 120 ms |
| Explosion and puddles | 18–23 | 130 ms |

Open `preview.html` in a browser. It embeds the PNG so no sibling file requests are necessary. Idle and nervous loop; squish returns to idle. Explosion holds its final puddle frame until another animation is selected. Click the character to squish. This is an animation preview, not the Android game. Generated poses still warrant visual refinement before final release.
