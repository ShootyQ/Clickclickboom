"""Prepare an optional upload key from Actions secrets without logging credentials."""
import base64
import os
from pathlib import Path

names = (
    'SPLAT_UPLOAD_KEYSTORE_BASE64', 'SPLAT_UPLOAD_STORE_PASSWORD',
    'SPLAT_UPLOAD_KEY_ALIAS', 'SPLAT_UPLOAD_KEY_PASSWORD',
)
present = [bool(os.environ.get(name)) for name in names]
if any(present) and not all(present):
    raise SystemExit('Incomplete upload-signing secrets: configure all four SPLAT_UPLOAD_* requirements.')
ready = all(present)
if ready:
    key = Path(os.environ['RUNNER_TEMP']) / 'splat-upload.p12'
    key.write_bytes(base64.b64decode(os.environ[names[0]], validate=True))
    key.chmod(0o600)
    with open(os.environ['GITHUB_ENV'], 'a') as env_file:
        env_file.write(f'SPLAT_UPLOAD_STORE_FILE={key}\n')
with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
    output.write(f'ready={str(ready).lower()}\n')
if not ready:
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
        summary.write('### Play upload signing\nDebug APK is available. The release bundle is compiled for validation, '
                      'but no Play AAB artifact is published until all four upload-signing secrets are configured. '
                      'See `android/TESTING.md`.\n')
