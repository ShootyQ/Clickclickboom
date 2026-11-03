"""Guard the actual Android/web distribution against oversized inline media."""
from pathlib import Path
import re
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
        paths = set(re.findall(r'assets/[a-zA-Z0-9_./-]+\.(?:png|wav|mp3)', page))
        self.assertEqual(len(paths), 9)
        for relative in paths:
            self.assertTrue((ROOT / 'dist' / relative).is_file(), relative)
            self.assertEqual((ROOT / 'dist' / relative).read_bytes(), (ROOT / relative).read_bytes(), relative)


if __name__ == '__main__':
    unittest.main()
