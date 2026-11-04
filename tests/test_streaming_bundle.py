"""Guard the actual Android/web distribution against oversized inline media."""
from pathlib import Path
import re
import json
import unittest

ROOT = Path(__file__).resolve().parents[1]


class StreamingBundleTests(unittest.TestCase):
    def test_entry_page_is_small_and_has_no_inline_binary_media(self):
        page = (ROOT / 'dist/index.html').read_text()
        self.assertLess(len(page.encode()), 1024 * 1024)
        self.assertNotIn('data:audio/', page)
        self.assertNotIn('data:image/', page)

    def test_every_bundled_asset_reference_resolves(self):
        page = (ROOT / 'dist/index.html').read_text()
        paths = set(re.findall(r'assets/[a-zA-Z0-9_./-]+\.(?:png|wav|mp3|ttf|js)', page))
        self.assertEqual(len(paths), 17)
        for relative in paths:
            self.assertTrue((ROOT / 'dist' / relative).is_file(), relative)
            if relative != 'assets/content/stories.js':
                self.assertEqual((ROOT / 'dist' / relative).read_bytes(), (ROOT / relative).read_bytes(), relative)

    def test_external_story_script_preserves_catalog_and_loads_before_controller(self):
        page = (ROOT / 'dist/index.html').read_text()
        marker = '<script src="assets/content/stories.js"></script>'
        self.assertIn(marker, page)
        self.assertLess(page.index(marker), page.index('const stories=globalThis.SplatStories;'))
        script = (ROOT / 'dist/assets/content/stories.js').read_text()
        self.assertTrue(script.startswith('globalThis.SplatStories = '))
        catalog = json.loads(script.removeprefix('globalThis.SplatStories = ').removesuffix(';\n'))
        sources = sorted((ROOT / 'stories').glob('*.md'))
        self.assertEqual([story['id'] for story in catalog], [p.stem for p in sources])
        for story, source in zip(catalog, sources):
            paragraphs = source.read_text().strip().split('\n\n')
            self.assertEqual(story['title'], paragraphs[0].removeprefix('# '))
            self.assertEqual(len(story['beats']), len(paragraphs) - 1)
            for index, (beat, text) in enumerate(zip(story['beats'], paragraphs[1:])):
                text = text.replace('\n', ' ')
                self.assertEqual(beat, {'id': f'beat-{index + 1:04}', 'text': text,
                                       'pauseAfterMs': max(1500, 600 + len(text.split()) * 300)})


if __name__ == '__main__':
    unittest.main()
