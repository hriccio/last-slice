import { cloudflare } from '@cloudflare/vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig({
  appType: 'spa',
  publicDir: './public',
  plugins: [cloudflare()],
});
