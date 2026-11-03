"""Build a dependency-free, self-contained playable prototype."""
from pathlib import Path
import base64
import json
import shutil

root = Path(__file__).resolve().parent
shell = (root / 'src/shell.html').read_text()
base_style = (root / 'src/style.css').read_text() + '\n' + (root / 'src/viewport.css').read_text()
style = base_style
font_licenses = '\n'.join((root / 'assets/fonts' / name).read_text() for name in ['PatrickHand-OFL.txt', 'LilitaOne-OFL.txt'])
buttons = base64.b64encode((root / 'assets/ui/menu-buttons.png').read_bytes()).decode()
logo = base64.b64encode((root / 'assets/ui/logo.png').read_bytes()).decode()
panel = base64.b64encode((root / 'assets/ui/game-panel.png').read_bytes()).decode()
style = style.replace('/* BUTTON_ART */', 'data:image/png;base64,' + buttons)
style = style.replace('/* GAME_PANEL_ART */', 'data:image/png;base64,' + panel)
for marker, name in [('/* HAND_FONT */', 'PatrickHand-Regular.ttf'), ('/* TITLE_FONT */', 'LilitaOne-Regular.ttf')]:
    style = style.replace(marker, 'data:font/ttf;base64,' + base64.b64encode((root / 'assets/fonts' / name).read_bytes()).decode())
core = (root / 'src/game.js').read_text()
story_core = (root / 'src/story.js').read_text()
milestone_core = (root / 'src/milestones.js').read_text()
audio_core = (root / 'src/audio.js').read_text()
store_core = (root / 'src/store.js').read_text()
sounds = {name: base64.b64encode((root / 'assets/audio' / filename).read_bytes()).decode()
          for name, filename in [('tap', 'tap.wav'), ('exploding', 'exploding.wav'), ('landing', 'explosionlanding.wav')]}
music = [{'title': title, 'src': 'data:audio/mpeg;base64,' + base64.b64encode((root / 'assets/music' / filename).read_bytes()).decode()}
         for title, filename in [('Slimey Breeze', 'slimey-breeze.mp3'), ('Slimey Breezy Day', 'slimey-breezy-day.mp3')]]
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
favicon = base64.b64encode((root / 'assets/ui/favicon-48.png').read_bytes()).decode()
sprite = base64.b64encode((root / 'assets/blob/blob-sprites-v3.png').read_bytes()).decode()
def render(page_style, page_logo, page_sounds, page_music, page_sprite, page_icon):
    return (shell.replace('/* GAME_CORE */', core).replace('/* FONT_LICENSES */', font_licenses)
    .replace('/* FAVICON_ART */', page_icon).replace('/* UI_STYLE */', page_style).replace('/* LOGO_ART */', page_logo)
    .replace('/* STORY_CORE */', story_core).replace('/* STORY_CATALOG */', catalog)
    .replace('/* MILESTONE_CORE */', milestone_core)
    .replace('/* AUDIO_CORE */', audio_core).replace('/* STORE_CORE */', store_core).replace('/* AUDIO_FILES */', json.dumps(page_sounds))
    .replace('/* MUSIC_FILES */', json.dumps(page_music))
    .replace('/* MILESTONE_CATALOG */', json.dumps(milestones, ensure_ascii=False).replace('<', '\\u003c'))
    .replace('/* SPRITE_DATA */', page_sprite))

# Preserve the downloadable standalone page, but do not load it into Android.
(root / 'index.html').write_text(render(style, 'data:image/png;base64,' + logo, sounds, music, 'data:image/png;base64,' + sprite, 'data:image/png;base64,' + favicon))

# A small entry document plus raw files avoids duplicating megabytes of base64
# in the Android Java heap, WebView IPC, HTML parser, and JavaScript strings.
dist = root / 'dist'
dist.mkdir(exist_ok=True)
streaming_style = base_style.replace('/* BUTTON_ART */', 'assets/ui/menu-buttons.png').replace('/* GAME_PANEL_ART */', 'assets/ui/game-panel.png').replace('/* HAND_FONT */', 'assets/fonts/PatrickHand-Regular.ttf').replace('/* TITLE_FONT */', 'assets/fonts/LilitaOne-Regular.ttf')
streaming_sounds = {name: 'assets/audio/' + filename for name, filename in [('tap', 'tap.wav'), ('exploding', 'exploding.wav'), ('landing', 'explosionlanding.wav')]}
streaming_music = [{'title': title, 'src': 'assets/music/' + filename} for title, filename in [('Slimey Breeze', 'slimey-breeze.mp3'), ('Slimey Breezy Day', 'slimey-breezy-day.mp3')]]
(dist / 'index.html').write_text(render(streaming_style, 'assets/ui/logo.png', streaming_sounds, streaming_music, 'assets/blob/blob-sprites-v3.png', 'assets/ui/favicon-48.png'))
shutil.copyfile(root / 'privacy.html', dist / 'privacy.html')
asset_paths = ['ui/favicon-48.png', 'ui/app-icon-512.png', 'blob/blob-sprites-v3.png', 'ui/logo.png', 'ui/menu-buttons.png', 'ui/game-panel.png',
               'audio/tap.wav', 'audio/exploding.wav', 'audio/explosionlanding.wav',
               'music/slimey-breeze.mp3', 'music/slimey-breezy-day.mp3',
               'fonts/PatrickHand-Regular.ttf', 'fonts/LilitaOne-Regular.ttf',
               'fonts/PatrickHand-OFL.txt', 'fonts/LilitaOne-OFL.txt']
for relative in asset_paths:
    destination = dist / 'assets' / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(root / 'assets' / relative, destination)
assert (dist / 'index.html').stat().st_size < 1024 * 1024, 'Startup page must remain below 1 MiB'
print(f'Streaming entry page: {(dist / "index.html").stat().st_size:,} bytes; media and art are separate files.')
print('Built index.html with embedded game logic and PNG sprites.')
print(f'Embedded {len(stories)} stories, {sum(len(story["beats"]) for story in stories)} dialogue beats.')
print(f'Embedded {len(milestones)} milestones and {sum(map(len, milestones.values()))} reactions.')
