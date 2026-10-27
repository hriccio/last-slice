#!/usr/bin/env python3
"""Deploy the reviewed API build with server secrets held only in an anonymous RAM fd.

Inject credentials with run-api-with-vault.py or the environment. Linux memfd is
required intentionally: decrypted keys must never be written to a temporary disk file.
"""
import json
import os
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parent.parent
project = root / 'deploy/cloudflare-api'
names = ['SUPABASE_SERVICE_ROLE_KEY', 'ASSISTANT_API_KEY', 'TURNSTILE_SECRET_KEY']
secrets = {name: os.environ.get(name, '').strip() for name in names}
if any(not value or '\n' in value or '\r' in value for value in secrets.values()):
    sys.exit('Inject all three API server secrets before deployment.')
if not hasattr(os, 'memfd_create'):
    sys.exit('This secret uploader requires Linux memfd; no disk-file fallback is allowed.')
config_path = project / '.cloudflare/output/v0/workers/default/worker.config.json'
if not config_path.exists():
    sys.exit('Build and review the API deployment dry run first.')
config = json.loads(config_path.read_text())
if config.get('name') != 'last-slice-api-staging':
    sys.exit('Refusing to deploy an unexpected Worker.')
fd = os.memfd_create('last-slice-api-secrets', flags=os.MFD_CLOEXEC)
try:
    # cf interprets paths without a .json suffix as dotenv. These values are
    # single-line server tokens; JSON string quoting is valid dotenv quoting.
    payload = '\n'.join(name + '=' + json.dumps(value) for name, value in secrets.items())
    os.write(fd, payload.encode())
    os.lseek(fd, 0, os.SEEK_SET)
    env = dict(os.environ)
    for name in names + ['CODEX_KC_SECRET', 'CODEX_KC_VAULT']:
        env.pop(name, None)
    result = subprocess.run(
        [str(project / 'node_modules/.bin/cf'), 'deploy', '--mode', 'staging',
         '--prebuilt', '--secrets-file', f'/proc/self/fd/{fd}'],
        cwd=project, env=env, pass_fds=(fd,), check=False,
    )
    sys.exit(result.returncode)
finally:
    os.close(fd)
