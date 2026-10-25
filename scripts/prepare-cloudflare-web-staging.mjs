import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'deploy/cloudflare-web');
const output = path.join(root, 'apps/web/dist');
const origin = process.env.STAGING_API_BASE_URL;
if (!origin || new URL(origin).protocol !== 'https:') {
  throw new Error('Set STAGING_API_BASE_URL to the HTTPS staging API origin.');
}

for (const workspace of ['@last-slice/contracts', '@last-slice/web']) {
  const build = spawnSync('npm', ['--workspace', workspace, 'run', 'build'], {
    cwd: root,
    env: { ...process.env, VITE_API_URL: origin },
    stdio: 'inherit',
  });
  if (build.error) throw build.error;
  if (build.status !== 0) process.exit(build.status ?? 1);
}

await rm(path.join(target, 'index.html'), { force: true });
await rm(path.join(target, 'public'), { recursive: true, force: true });
await mkdir(path.join(target, 'public'), { recursive: true });
await cp(path.join(output, 'index.html'), path.join(target, 'index.html'));
for (const entry of await readdir(output)) {
  if (entry === 'index.html') continue;
  await cp(path.join(output, entry), path.join(target, 'public', entry), { recursive: true });
}
console.log(`Prepared React web assets with API origin ${new URL(origin).origin}`);
