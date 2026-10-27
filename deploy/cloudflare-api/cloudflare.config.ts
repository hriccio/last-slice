import {bindings,defineConfig,exports} from '@cloudflare/config';

import * as entrypoint from './worker.ts' with {type:'cf-worker'};
const workerReference={name:'last-slice-api-staging',compatibilityDate:'2026-10-27',entrypoint,exports:{DemoCoordinator:exports.durableObject({storage:'sqlite'})}};

export default defineConfig({
 accountId:'1ae390f76f0a4b24c47f58f6e1c0e9b4',
 worker:{
  ...workerReference,
  compatibilityFlags:['nodejs_compat'],
  workersDev:true,
  previewUrls:false,
  env:{
   NODE_ENV:bindings.text('production'),KITCHEN_MODE:bindings.text('public-demo'),PUBLIC_DEMO_GUARDRAILS:bindings.text('true'),
   SUPABASE_URL:bindings.text('https://tityohurziwhqmlybvye.supabase.co'),
   ASSISTANT_PROVIDER:bindings.text('openai'),ASSISTANT_MODEL:bindings.text('gpt-5-nano-2025-08-07'),
   ASSISTANT_PRICE_POLICY:bindings.text('gpt-5-nano-2025-08-07:4000:800:2026-10-24'),
   ALLOWED_ORIGINS:bindings.text('https://last-slice-pwa-staging.hriccio.workers.dev,https://last-slice-web-staging.hriccio.workers.dev'),
   SUPABASE_SERVICE_ROLE_KEY:bindings.secret(),ASSISTANT_API_KEY:bindings.secret(),TURNSTILE_SECRET_KEY:bindings.secret(),
   DEMO_COORDINATOR:bindings.durableObject({worker:workerReference,exportName:'DemoCoordinator'}),
  },
  observability:{enabled:true,redactQueryString:true,logs:{enabled:true,invocationLogs:false,headSamplingRate:0.1},traces:{enabled:true,headSamplingRate:0.01}},
 },
});
