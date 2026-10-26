import { cp, mkdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const deployRoot = path.join(repoRoot, 'deploy/cloudflare-pwa');
const flutterOutput = path.join(repoRoot, 'apps/mobile/build/web');
const apiBaseUrl = process.env.STAGING_API_BASE_URL;
const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY;

if (!apiBaseUrl || new URL(apiBaseUrl).protocol !== 'https:') {
  throw new Error('Set STAGING_API_BASE_URL to the HTTPS public-demo API origin.');
}
if (!turnstileSiteKey) throw new Error('Set TURNSTILE_SITE_KEY for the public staging PWA.');

const flutter = spawnSync('flutter', [
  'build', 'web', '--release', `--dart-define=API_BASE_URL=${apiBaseUrl}`, `--dart-define=TURNSTILE_SITE_KEY=${turnstileSiteKey}`,
], { cwd: path.join(repoRoot, 'apps/mobile'), stdio: 'inherit' });

if (flutter.error) throw flutter.error;
if (flutter.status !== 0) process.exit(flutter.status ?? 1);

await rm(path.join(deployRoot, 'index.html'), { force: true });
await rm(path.join(deployRoot, 'public'), { recursive: true, force: true });
await mkdir(path.join(deployRoot, 'public'), { recursive: true });
await cp(path.join(flutterOutput, 'index.html'), path.join(deployRoot, 'index.html'));

for (const entry of await import('node:fs/promises').then(({ readdir }) => readdir(flutterOutput, { withFileTypes: true }))) {
  if (entry.name === 'index.html') continue;
  await cp(path.join(flutterOutput, entry.name), path.join(deployRoot, 'public', entry.name), { recursive: true });
}

console.log(`Prepared Flutter PWA assets with API origin ${new URL(apiBaseUrl).origin}`);
