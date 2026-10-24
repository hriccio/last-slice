import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir:'./tests',
  testMatch:'*.web.spec.ts',
  fullyParallel:true,
  workers:2,
  use:{
    baseURL:'http://127.0.0.1:5179',
    browserName:'chromium',
    launchOptions:process.env.CHROMIUM_EXECUTABLE ? {executablePath:process.env.CHROMIUM_EXECUTABLE} : {},
    trace:'retain-on-failure',
  },
  webServer:{
    command:'npm --workspace @last-slice/web run dev -- --host 127.0.0.1 --port 5179 --strictPort',
    url:'http://127.0.0.1:5179',
    env:{VITE_API_URL:'http://127.0.0.1:34117'},
  },
});
