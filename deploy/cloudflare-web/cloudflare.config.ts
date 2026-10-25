import { defineConfig } from '@cloudflare/config';

export default defineConfig({
  worker: {
    name: 'last-slice-web-staging',
    compatibilityDate: '2026-10-25',
    assets: { notFoundHandling: 'single-page-application' },
  },
});
