"""Build a dependency-free, self-contained playable prototype."""
from pathlib import Path
import base64
import json

root = Path(__file__).resolve().parent
shell = (root / 'src/shell.html').read_text()
core = (root / 'src/game.js').read_text()
story_core = (root / 'src/story.js').read_text()
milestone_core = (root / 'src/milestones.js').read_text()
audio_core = (root / 'src/audio.js').read_text()
sounds = {name: base64.b64encode((root / 'assets/audio' / filename).read_bytes()).decode()
          for name, filename in [('tap', 'tap.wav'), ('exploding', 'exploding.wav'), ('landing', 'explosionlanding.wav')]}
milestones = json.loads((root / 'content/milestones.json').read_text())
assert len(milestones) == 50, 'Expected 50 milestones'
assert all(len(lines) == 10 and len(set(lines)) == 10 for lines in milestones.values()), 'Each milestone needs 10 unique lines'
stories = []
for path in sorted((root / 'stories').glob('*.md')):
    paragraphs = path.read_text().strip().split('\n\n')
    beats = []
    for index, text in enumerate(paragraphs[1:]):
        text = text.replace('\n', ' ')
        beats.append({'id': f'beat-{index + 1:04}', 'text': text,
                      'pauseAfterMs': max(1500, 600 + len(text.split()) * 300)})
    assert beats, f'Empty story: {path}'
    stories.append({'id': path.stem, 'title': paragraphs[0].removeprefix('# '), 'beats': beats})
assert stories, 'At least one story is required'
catalog = json.dumps(stories, ensure_ascii=False).replace('<', '\\u003c')
sprite = base64.b64encode((root / 'assets/blob/blob-sprites-v3.png').read_bytes()).decode()
(root / 'index.html').write_text(shell.replace('/* GAME_CORE */', core)
    .replace('/* STORY_CORE */', story_core).replace('/* STORY_CATALOG */', catalog)
    .replace('/* MILESTONE_CORE */', milestone_core)
    .replace('/* AUDIO_CORE */', audio_core).replace('/* AUDIO_FILES */', json.dumps(sounds))
    .replace('/* MILESTONE_CATALOG */', json.dumps(milestones, ensure_ascii=False).replace('<', '\\u003c'))
    .replace('/* SPRITE_DATA */', 'data:image/png;base64,' + sprite))
print('Built index.html with embedded game logic and PNG sprites.')
print(f'Embedded {len(stories)} stories, {sum(len(story["beats"]) for story in stories)} dialogue beats.')
print(f'Embedded {len(milestones)} milestones and {sum(map(len, milestones.values()))} reactions.')
