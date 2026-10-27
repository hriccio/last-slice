import {DurableObject} from 'cloudflare:workers';
import {createApi} from '../../apps/api/src/api.js';
import {webResponse} from '../../apps/api/src/web-adapter.js';
import {assertHostedConfiguration,DemoLimits} from '../../apps/api/src/hosted-policy.js';

function runtimeEnv(env:Env):NodeJS.ProcessEnv {
 const {NODE_ENV,KITCHEN_MODE,PUBLIC_DEMO_GUARDRAILS,SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,ASSISTANT_API_KEY,TURNSTILE_SECRET_KEY,ASSISTANT_PROVIDER,ASSISTANT_MODEL,ASSISTANT_PRICE_POLICY,ALLOWED_ORIGINS}=env;
 return {NODE_ENV,KITCHEN_MODE,PUBLIC_DEMO_GUARDRAILS,SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,ASSISTANT_API_KEY,TURNSTILE_SECRET_KEY,ASSISTANT_PROVIDER,ASSISTANT_MODEL,ASSISTANT_PRICE_POLICY,ALLOWED_ORIGINS};
}
const coordinatorName='public-demo-v1';
const unavailable=()=>Response.json({error:{code:'assistant_unavailable',messageKey:'errors.assistant_unavailable'}},{status:503,headers:{'cache-control':'no-store'}});
// Cache only the configured API/client, never a Request or its I/O. Each Env belongs
// to one deployment; hosted business state lives in Supabase, assistant state in the DO.
const statelessApis=new WeakMap<Env,ReturnType<typeof createApi>>();

// Only shared coordination/assistant work comes here; ordinary business routes run in the Worker.
// The one global FIFO is the coordination atom. Supabase owns all durable business/accounting state.
export class DemoCoordinator extends DurableObject<Env>{
 private api:ReturnType<typeof createApi>;
 private limits=new DemoLimits();
 private lastCleanup=0;
 constructor(ctx:DurableObjectState,env:Env){
  super(ctx,env);
  assertHostedConfiguration(runtimeEnv(env));
  this.api=createApi({env:runtimeEnv(env),timers:false,permit:async(path,method,ip)=>this.limits.permit(path,method,ip)});
  ctx.blockConcurrencyWhile(async()=>{if(await ctx.storage.getAlarm()===null)await ctx.storage.setAlarm(Date.now()+5000);});
 }
 async permit(path:string,method:string,ip:string){return this.limits.permit(path,method,ip);}
 async handle(request:Request){return webResponse(this.api,request);}
 async alarm(){
  // Persist the next wake-up before external I/O. Only the alarm timestamp is stored here.
  await this.ctx.storage.setAlarm(Date.now()+5000);
  await this.api.kitchenTick();
  if(Date.now()-this.lastCleanup>=60000){this.lastCleanup=Date.now();await this.api.cleanup();}
  // The provider has an eight-second timeout. waitUntil ties it to hosted execution,
  // and avoids delaying the next kitchen alarm while the model is responding.
  const work=this.api.assistantTick();
  if(work)this.ctx.waitUntil(work.catch(()=>console.error(JSON.stringify({event:'assistant_tick_failed'}))));
 }
}

export default {
 async fetch(request:Request,env:Env):Promise<Response>{
  try{
   assertHostedConfiguration(runtimeEnv(env));
   const stub=env.DEMO_COORDINATOR.getByName(coordinatorName);
   if(new URL(request.url).pathname.startsWith('/assistant/'))return await stub.handle(request);
   let api=statelessApis.get(env);
   if(!api){api=createApi({env:runtimeEnv(env),timers:false,assistant:false,permit:(path,method,ip)=>env.DEMO_COORDINATOR.getByName(coordinatorName).permit(path,method,ip)});statelessApis.set(env,api);}
   return await webResponse(api,request);
  }catch{
   console.error(JSON.stringify({event:'api_unavailable'}));
   return unavailable();
  }
 },
} satisfies ExportedHandler<Env>;
