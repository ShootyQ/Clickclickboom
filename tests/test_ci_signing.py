"""Exercise signing setup without access to real credentials."""
import base64
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'android/prepare_ci_signing.py'


class SigningPreparationTests(unittest.TestCase):
    def run_setup(self, values):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        root = Path(directory.name)
        env = {key: value for key, value in os.environ.items() if not key.startswith('SPLAT_UPLOAD_')}
        env.update(RUNNER_TEMP=str(root), GITHUB_ENV=str(root / 'env'),
                   GITHUB_OUTPUT=str(root / 'output'), GITHUB_STEP_SUMMARY=str(root / 'summary'))
        env.update(values)
        result = subprocess.run([sys.executable, str(SCRIPT)], env=env, capture_output=True, text=True)
        return root, result

    def test_no_secrets_does_not_publish_a_play_bundle(self):
        root, result = self.run_setup({})
        self.assertEqual(result.returncode, 0)
        self.assertEqual((root / 'output').read_text(), 'ready=false\n')
        self.assertFalse((root / 'splat-upload.p12').exists())
        self.assertIn('no Play AAB artifact', (root / 'summary').read_text())

    def test_complete_secrets_prepare_private_key_without_logging_values(self):
        values = {'SPLAT_UPLOAD_KEYSTORE_BASE64': base64.b64encode(b'fake-keystore').decode(),
                  'SPLAT_UPLOAD_STORE_PASSWORD': 'test-only-store-password',
                  'SPLAT_UPLOAD_KEY_ALIAS': 'test-only-alias',
                  'SPLAT_UPLOAD_KEY_PASSWORD': 'test-only-key-password'}
        root, result = self.run_setup(values)
        self.assertEqual(result.returncode, 0)
        self.assertEqual((root / 'output').read_text(), 'ready=true\n')
        self.assertEqual((root / 'splat-upload.p12').read_bytes(), b'fake-keystore')
        self.assertEqual((root / 'splat-upload.p12').stat().st_mode & 0o777, 0o600)
        self.assertIn('SPLAT_UPLOAD_STORE_FILE=', (root / 'env').read_text())
        for value in values.values():
            self.assertNotIn(value, result.stdout + result.stderr + (root / 'env').read_text())

    def test_partial_secrets_fail_instead_of_silently_building_unsigned(self):
        root, result = self.run_setup({'SPLAT_UPLOAD_STORE_PASSWORD': 'test-only-secret'})
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('test-only-secret', result.stdout + result.stderr)
        self.assertFalse((root / 'splat-upload.p12').exists())

    def test_bad_encoding_does_not_produce_a_key(self):
        root, result = self.run_setup({'SPLAT_UPLOAD_KEYSTORE_BASE64': 'not valid base64!',
                                      'SPLAT_UPLOAD_STORE_PASSWORD': 'test',
                                      'SPLAT_UPLOAD_KEY_ALIAS': 'test',
                                      'SPLAT_UPLOAD_KEY_PASSWORD': 'test'})
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((root / 'splat-upload.p12').exists())


if __name__ == '__main__':
    unittest.main()
