#!/usr/bin/env python3
"""Read the provider key at runtime and replace this process with the API command."""
import os
import subprocess
import sys

vault = os.environ.get('CODEX_KC_VAULT')
password = os.environ.get('CODEX_KC_SECRET')
if not vault or not password:
    sys.exit('Configure CODEX_KC_VAULT and CODEX_KC_SECRET in your local environment first.')
vault = os.path.expanduser(vault)
try:
    result = subprocess.run(
        ['keepassxc-cli', 'show', '-s', '-a', 'password', vault,
         os.environ.get('ASSISTANT_VAULT_ENTRY', 'OPENAI_API_KEY')],
        input=password + '\n', text=True, capture_output=True, timeout=20,
    )
except (OSError, subprocess.TimeoutExpired):
    sys.exit('Could not read the assistant credential from the vault.')
key = result.stdout.strip()
if result.returncode or not key.startswith('sk-'):
    sys.exit('Could not unlock the vault or locate the assistant credential.')
env = dict(os.environ)
env['ASSISTANT_API_KEY'] = key
env['ASSISTANT_PROVIDER'] = 'openai'
env['ASSISTANT_MODEL'] = 'gpt-5-nano-2025-08-07'
database_entry = os.environ.get('SUPABASE_VAULT_ENTRY')
if database_entry:
    try:
        database_result = subprocess.run(
            ['keepassxc-cli', 'show', '-s', '-a', 'password', vault, database_entry],
            input=password + '\n', text=True, capture_output=True, timeout=20,
        )
    except (OSError, subprocess.TimeoutExpired):
        sys.exit('Could not read the Supabase credential from the vault.')
    if database_result.returncode or not database_result.stdout.strip():
        sys.exit('Could not unlock the vault or locate the Supabase credential.')
    env['SUPABASE_SERVICE_ROLE_KEY'] = database_result.stdout.strip()
turnstile_entry = os.environ.get('TURNSTILE_VAULT_ENTRY')
if turnstile_entry:
    try:
        turnstile_result = subprocess.run(
            ['keepassxc-cli', 'show', '-s', '-a', 'password', vault, turnstile_entry],
            input=password + '\n', text=True, capture_output=True, timeout=20,
        )
    except (OSError, subprocess.TimeoutExpired):
        sys.exit('Could not read the Turnstile credential from the vault.')
    if turnstile_result.returncode or not turnstile_result.stdout.strip():
        sys.exit('Could not unlock the vault or locate the Turnstile credential.')
    env['TURNSTILE_SECRET_KEY'] = turnstile_result.stdout.strip()
# The API does not need the vault password after credential injection.
env.pop('CODEX_KC_SECRET', None)
env.pop('CODEX_KC_VAULT', None)
command = sys.argv[1:] or ['npm', 'run', 'dev:api']
os.execvpe(command[0], command, env)
