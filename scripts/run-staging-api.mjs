import { loadEnvFile } from 'node:process';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  loadEnvFile(path.join(root, '.env.staging'));
} catch (error) {
  if (error.code !== 'ENOENT') throw new Error('Could not load .env.staging.');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_KEY;
if (!process.env.ASSISTANT_API_KEY && process.env.OPENAI_API_KEY) process.env.ASSISTANT_API_KEY = process.env.OPENAI_API_KEY;
const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ASSISTANT_API_KEY'];
const missing = required.filter(name => !process.env[name]?.trim());
if (missing.length) throw new Error(`Missing staging configuration: ${missing.join(', ')}`);
if (!process.env.TURNSTILE_SECRET_KEY?.trim()) throw new Error('Missing staging configuration: TURNSTILE_SECRET_KEY');
if (process.env.SUPABASE_URL !== 'https://tityohurziwhqmlybvye.supabase.co') {
  throw new Error('Staging must use the agreed Supabase project.');
}
const databaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let serverKey = databaseKey.startsWith('sb_secret_');
if (!serverKey) {
  try {
    const claims = JSON.parse(Buffer.from(databaseKey.split('.')[1], 'base64url').toString());
    serverKey = claims.role === 'service_role' && claims.ref === 'tityohurziwhqmlybvye';
  } catch { /* Invalid or public keys must never start the staging API. */ }
}
if (!serverKey) throw new Error('Staging needs a Supabase server secret or project service-role key, not a public key.');
if (process.env.ASSISTANT_PROVIDER && process.env.ASSISTANT_PROVIDER !== 'openai') {
  throw new Error('Staging requires the real OpenAI provider.');
}
if (process.env.ASSISTANT_MODEL && process.env.ASSISTANT_MODEL !== 'gpt-5-nano-2025-08-07') {
  throw new Error('Staging requires the model covered by the durable budget policy.');
}
if (process.env.ASSISTANT_PRICE_POLICY && process.env.ASSISTANT_PRICE_POLICY !== 'gpt-5-nano-2025-08-07:4000:800:2026-10-24') {
  throw new Error('Staging requires the existing US$1/day budget policy.');
}

const env = {
  ...process.env,
  NODE_ENV: 'production',
  KITCHEN_MODE: 'public-demo',
  PUBLIC_DEMO_GUARDRAILS: 'true',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'https://last-slice-pwa-staging.hriccio.workers.dev,https://last-slice-web-staging.hriccio.workers.dev',
  ASSISTANT_PROVIDER: 'openai',
  ASSISTANT_MODEL: 'gpt-5-nano-2025-08-07',
};
delete env.CODEX_KC_SECRET;
delete env.CODEX_KC_VAULT;
const child = spawn(process.execPath, ['apps/api/dist/index.js'], { cwd: root, env, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', () => { console.error('Could not start the built staging API. Run npm run build first.'); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = signal ? 1 : (code ?? 1); });
