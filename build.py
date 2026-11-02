"""Build a dependency-free, self-contained playable prototype."""
from pathlib import Path
import base64

root = Path(__file__).resolve().parent
shell = (root / 'src/shell.html').read_text()
core = (root / 'src/game.js').read_text()
sprite = base64.b64encode((root / 'assets/blob/blob-sprites-v3.png').read_bytes()).decode()
(root / 'index.html').write_text(shell.replace('/* GAME_CORE */', core).replace('/* SPRITE_DATA */', 'data:image/png;base64,' + sprite))
print('Built index.html with embedded game logic and PNG sprites.')
