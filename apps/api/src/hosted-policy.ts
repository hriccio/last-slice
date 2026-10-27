import {createHash} from 'node:crypto';
import {ASSISTANT_MODEL,PRICE_POLICY} from './assistant-provider.js';

export const STAGING_DATABASE='https://tityohurziwhqmlybvye.supabase.co';
export function assertHostedConfiguration(env:NodeJS.ProcessEnv){
 if(env.NODE_ENV!=='production'||env.KITCHEN_MODE!=='public-demo'||env.PUBLIC_DEMO_GUARDRAILS!=='true'||
  env.SUPABASE_URL!==STAGING_DATABASE||!env.SUPABASE_SERVICE_ROLE_KEY?.trim()||!env.ASSISTANT_API_KEY?.trim()||
  !env.TURNSTILE_SECRET_KEY?.trim()||env.ASSISTANT_PROVIDER!=='openai'||env.ASSISTANT_MODEL!==ASSISTANT_MODEL||
  env.ASSISTANT_PRICE_POLICY!==PRICE_POLICY||!env.ALLOWED_ORIGINS?.trim())throw new Error('Invalid hosted staging configuration');
 const key=env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key.startsWith('sb_secret_')){
  let claims;try{claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString());}catch{}
  if(claims?.role!=='service_role'||claims?.ref!=='tityohurziwhqmlybvye')throw new Error('Hosted staging requires the agreed Supabase server credential');
 }
 const origins=env.ALLOWED_ORIGINS.split(',');
 if(origins.length!==2||!['https://last-slice-web-staging.hriccio.workers.dev','https://last-slice-pwa-staging.hriccio.workers.dev'].every(o=>origins.includes(o)))throw new Error('Invalid hosted staging origins');
}

export interface Permit {allowed:boolean;code?:string;retryAfterSeconds?:number}
export class DemoLimits {
 private counters=new Map<string,{start:number;count:number}>();
 constructor(private now:()=>number=Date.now){}
 permit(path:string,method:string,ip:string):Permit{
  const now=this.now();
  for(const [key,value]of this.counters)if(now-value.start>=60000)this.counters.delete(key);
  const client=createHash('sha256').update(ip).digest('hex');
  const buckets:[string,number][]=[];
  const publicRead=['/orders','/quotes','/menu'].includes(path)||path.startsWith('/orders/')||path.startsWith('/kitchen/');
  const assistant=path.startsWith('/assistant/');
  if(publicRead)buckets.push([`read:${client}`,120]);
  if(path==='/orders'&&method==='POST')buckets.push([`order:${client}`,10]);
  if(path==='/assistant/messages'&&method==='POST')buckets.push([`send:${client}`,8]);
  if(assistant)buckets.push([`assistant:${client}`,60]);
  if(publicRead)buckets.push(['global-read',600]);
  if(assistant)buckets.push(['global-assistant',600]);
  for(const [key,max]of buckets){
   let value=this.counters.get(key);
   if(!value){
    // Reject new entries at capacity, rather than letting churn evict active limits.
    if(this.counters.size>=10000)return {allowed:false,code:'demo_capacity_reached',retryAfterSeconds:60};
    value={start:now,count:0};this.counters.set(key,value);
   }
   if(++value.count>max)return {allowed:false,code:key==='global-assistant'?'assistant_queue_full':'demo_capacity_reached',retryAfterSeconds:Math.max(1,Math.ceil((value.start+60000-now)/1000))};
  }
  return {allowed:true};
 }
}
