import test from 'node:test';
import assert from 'node:assert/strict';
import {DemoLimits,assertHostedConfiguration} from '../apps/api/src/hosted-policy.js';
import {createApi} from '../apps/api/src/api.js';
import {webResponse} from '../apps/api/src/web-adapter.js';

test('hosted admission coordinates client/global capacity, expiry and bounded identity churn',()=>{
 let now=0;const limits=new DemoLimits(()=>now);
 for(let i=0;i<10;i++)assert.equal(limits.permit('/orders','POST','one').allowed,true);
 assert.equal(limits.permit('/orders','POST','one').allowed,false);
 now=60000;assert.equal(limits.permit('/orders','POST','one').allowed,true);
 const reads=new DemoLimits(()=>now);
 for(let i=0;i<600;i++)assert.equal(reads.permit('/menu','GET',`client-${i}`).allowed,true);
 assert.equal(reads.permit('/kitchen/orders','GET','new').allowed,false);
 now+=60000;assert.equal(reads.permit('/menu','GET','new').allowed,true);
 const controls=new DemoLimits(()=>now);
 for(let i=0;i<600;i++)assert.equal(controls.permit('/assistant/requests/id','GET',`client-${i}`).allowed,true);
 assert.equal(controls.permit('/assistant/requests/id','GET','new').code,'assistant_queue_full');
});

test('Web transport preserves UTF-8, CORS, byte bounds, native compatibility and API envelopes',async()=>{
 const api=createApi({env:{NODE_ENV:'test',KITCHEN_MODE:'public-demo',ASSISTANT_PROVIDER:'fake'},timers:false,assistant:false});
 const request=(path:string,options:RequestInit={})=>webResponse(api,new Request(`https://api.example${path}`,options));
 const menu=await request('/menu?locale=pt-BR',{headers:{origin:'http://localhost:5173'}});
 assert.equal(menu.status,200);assert.equal(menu.headers.get('access-control-allow-origin'),'http://localhost:5173');
 assert.equal((await menu.json()).flavors.length,5);
 assert.equal((await request('/menu?locale=en-US',{headers:{origin:'https://unlisted.example'}})).status,403);
 assert.equal((await request('/config',{method:'OPTIONS',headers:{origin:'http://localhost:5173'}})).status,204);
 const quote=await request('/quotes',{method:'POST',body:JSON.stringify({fulfillment:'pickup',lines:[{flavorId:'calabresa',sizeId:'media',crustId:'traditional',removedIngredientIds:[],extraToppingIds:[],quantity:1}]})});
 assert.equal(quote.status,200);
 const huge=await request('/quotes',{method:'POST',body:JSON.stringify({text:'á'.repeat(24000)})});
 assert.equal(huge.status,400);
});

test('hosted configuration rejects missing secrets and all fake/memory/foreign-project fallbacks',()=>{
 const valid={NODE_ENV:'production',KITCHEN_MODE:'public-demo',PUBLIC_DEMO_GUARDRAILS:'true',SUPABASE_URL:'https://tityohurziwhqmlybvye.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'sb_secret_fixture',ASSISTANT_API_KEY:'sk-fixture',TURNSTILE_SECRET_KEY:'fixture',ASSISTANT_PROVIDER:'openai',ASSISTANT_MODEL:'gpt-5-nano-2025-08-07',ASSISTANT_PRICE_POLICY:'gpt-5-nano-2025-08-07:4000:800:2026-10-24',ALLOWED_ORIGINS:'https://last-slice-pwa-staging.hriccio.workers.dev,https://last-slice-web-staging.hriccio.workers.dev'};
 assert.doesNotThrow(()=>assertHostedConfiguration(valid));
 for(const key of Object.keys(valid))assert.throws(()=>assertHostedConfiguration({...valid,[key]:''}));
 assert.throws(()=>assertHostedConfiguration({...valid,ASSISTANT_PROVIDER:'fake'}));
 assert.throws(()=>assertHostedConfiguration({...valid,SUPABASE_SERVICE_ROLE_KEY:'public-key'}));
});
