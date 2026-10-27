import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {setTimeout as pause} from 'node:timers/promises';
import {Miniflare,Response as MFResponse} from 'miniflare';
import helpers from '../../../tests/helpers.ts';
const {sqlDatabase,rpcFixture}=helpers;

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.resolve(project,'../..');
process.chdir(root);
const webOrigin='https://last-slice-web-staging.hriccio.workers.dev';

test('actual Workers runtime preserves hosted flows, alarm dispatch, transient ownership and durable spending', {timeout:60000},async t=>{
 const db=await sqlDatabase();
 t.after(()=>db.close());const backend=await rpcFixture(t,db);
 const bundle=await readFile(path.join(project,'.cloudflare/output/v0/workers/default/bundle/index.js'),'utf8');
 const storage=await mkdtemp(path.join(tmpdir(),'last-slice-worker-test-'));t.after(()=>rm(storage,{recursive:true,force:true}));
 const config=JSON.parse(await readFile(path.join(project,'.cloudflare/output/v0/workers/default/worker.config.json'),'utf8'));
 let calls=0;let kitchenTicks=0;
 const instantiate=(missingSecret=false)=>{
  const worker=structuredClone(config);
  worker.manifest={mainModule:'index.js',modules:{'index.js':{type:'esm',contents:bundle}}};
  for(const [key,value]of Object.entries({SUPABASE_SERVICE_ROLE_KEY:'sb_secret_fixture',ASSISTANT_API_KEY:'sk-fixture',TURNSTILE_SECRET_KEY:missingSecret?'':'fixture-turnstile'}))worker.env[key]={type:'text',value};
  return new Miniflare({resourcePersistencePath:storage,logRequests:false,telemetry:{enabled:false},workers:[{config:worker,dev:{
   outboundService:{type:'fetcher',handler:async(request)=>{
    const url=new URL(request.url);
    if(url.hostname==='tityohurziwhqmlybvye.supabase.co'){
     if(url.pathname.endsWith('/advance_demo_kitchen'))kitchenTicks++;
     const text=request.method==='GET'?undefined:await request.text();
     let response;try{response=await fetch(backend+url.pathname+url.search,{method:request.method,headers:{'content-type':'application/json'},...(text===undefined?{}:{body:text})});}catch(e){console.error('Fixture fetch:',(e as Error).message);throw e;}
     if(response.status!==200)console.error('Fixture HTTP:',url.pathname,response.status);
     return new MFResponse(await response.text(),{status:response.status,headers:response.headers});
    }
    if(url.hostname==='challenges.cloudflare.com')return MFResponse.json({success:(await request.text()).includes('response=fixture-valid-token'),hostname:new URL(webOrigin).hostname});
    if(url.hostname==='api.openai.com'){
     calls++;const body=await request.json() as any;
     assert.equal(body.store,false);assert.equal(body.max_completion_tokens,800);
     return MFResponse.json({choices:[{message:{content:JSON.stringify({reply:'Review this medium Calabresa proposal before applying it.',candidate:{operation:'add',targetLineId:null,line:{flavorId:'calabresa',sizeId:'media',crustId:'traditional',removedIngredientIds:[],extraToppingIds:[],quantity:1}}})}}],usage:{prompt_tokens:300,completion_tokens:50}});
    }
    throw new Error('Unexpected network destination in Worker test');
   }}}}]});
 };
 let mf=instantiate();t.after(()=>mf.dispose());
 const request=(route:string,options:any={})=>mf.dispatchFetch(`https://api.example${route}`,options);
 assert.equal((await request('/config')).status,200);
 const menu=await request('/menu?locale=en-US',{headers:{origin:webOrigin}});assert.equal(menu.status,200);assert.equal(menu.headers.get('access-control-allow-origin'),webOrigin);
 assert.equal((await request('/menu?locale=pt-BR')).status,200);
 assert.equal((await request('/menu?locale=en-US',{headers:{origin:'https://unlisted.example'}})).status,403);
 const orderBody={idempotencyKey:randomUUID(),locale:'en-US',fulfillment:'pickup',fixtureId:'demo-pickup',lines:[{flavorId:'calabresa',sizeId:'media',crustId:'traditional',removedIngredientIds:[],extraToppingIds:[],quantity:1}]};
 const post={method:'POST',headers:{origin:webOrigin,'content-type':'application/json'},body:JSON.stringify(orderBody)};
 assert.equal((await request('/orders',post)).status,403);
 assert.equal((await db.query('select * from demo_orders')).rows.length,0);
 const accepted={...post,body:JSON.stringify({...orderBody,turnstileToken:'fixture-valid-token'})};
 const order=await request('/orders',accepted);assert.equal(order.status,201,await order.clone().text());const confirmation=await order.json() as any;
 assert.equal((await request('/orders',accepted)).status,200);
 assert.equal((await request(`/orders/${confirmation.orderCode}`)).status,200);
 assert.equal((await request('/kitchen/orders')).status,200);
 assert.equal((await request('/kitchen/orders/code/status',{method:'PATCH'})).status,403);
 const cap='a'.repeat(64),id=randomUUID(),snapshot={revision:0,fulfillment:'pickup',lines:[]};
 const assistantHeaders={authorization:`Bearer ${cap}`,'content-type':'application/json'};
 const payload={requestId:id,locale:'en-US',message:'Suggest one medium Calabresa with traditional crust.',history:[],context:{screen:'menu',cartSnapshot:snapshot}};
 const send=()=>request('/assistant/messages',{method:'POST',headers:assistantHeaders,body:JSON.stringify(payload)});
 assert.equal((await send()).status,202);assert.equal((await send()).status,202);
 let ticket:any;
 for(let i=0;i<30;i++){const response=await request(`/assistant/requests/${id}`,{headers:assistantHeaders});assert.equal(response.status,200);ticket=await response.json();if(ticket.state==='completed')break;await pause(500);}
 assert.equal(ticket.state,'completed');assert.equal(calls,1);assert.ok(kitchenTicks>0);assert.equal(ticket.proposal.operation,'add');
 const confirm=()=>request(`/assistant/proposals/${ticket.proposal.id}/confirm`,{method:'POST',headers:assistantHeaders,body:JSON.stringify({cartSnapshot:snapshot})});
 assert.equal((await confirm()).status,200);assert.equal((await confirm()).status,200);assert.equal(calls,1);
 assert.equal((await request(`/assistant/requests/${id}`,{headers:{authorization:`Bearer ${'b'.repeat(64)}`}})).status,410);
 const pending=randomUUID();const waiting=await request('/assistant/messages',{method:'POST',headers:assistantHeaders,body:JSON.stringify({...payload,requestId:pending})});assert.equal(waiting.status,202);
 // Replacement discards chat/proposals while keeping Supabase reservations, orders and pacing.
 await mf.dispose();mf=instantiate();
 assert.equal((await request(`/orders/${confirmation.orderCode}`)).status,200);
 assert.equal((await send()).status,410);
 const lost=await request(`/assistant/requests/${pending}`,{headers:assistantHeaders});assert.equal(lost.status,503);
 assert.equal((await confirm()).status,410);assert.equal(calls,1);
 const attempts=(await db.query<{charge_nano:number}>('select charge_nano from assistant_attempts')).rows;
 assert.equal(attempts.length,1);assert.equal(attempts[0].charge_nano,35000);
 await mf.dispose();mf=instantiate(true);assert.equal((await request('/config')).status,503);
});
