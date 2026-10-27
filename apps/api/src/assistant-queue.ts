import {createHash,randomUUID} from 'node:crypto';
import type {AssistantTicket} from '@last-slice/contracts';
import type {SupabaseClient} from '@supabase/supabase-js';
import {callAssistant,type ProviderMessage,type ProviderResult} from './assistant-provider.js';
export const WCS_NANO=520000,DAILY_NANO=1000000000,SLOT_MS=45000;
type Action='admit'|'get'|'peek'|'claim'|'finish'|'cancel';
export interface LedgerView extends Partial<AssistantTicket>{processId?:string;claimed?:boolean;retryAt?:string}
export interface Ledger {action(action:Action,id:string,owner:string,process:string,usage?:{input?:number;output?:number;error?:string}):Promise<LedgerView>}
export class SupabaseLedger implements Ledger {
 constructor(private db:SupabaseClient){}
 async action(action:Action,id:string,owner:string,process:string,usage?:{input?:number;output?:number;error?:string}):Promise<LedgerView>{
  const {data,error}=await this.db.rpc('assistant_action',{p_action:action,p_id:id,p_owner:owner,p_process:process,
   ...(usage?{p_input:usage.input??null,p_output:usage.output??null,p_error:usage.error??null}:{})});
  if(error||!data)throw new Error('assistant_unavailable');return data;
 }
}
interface MemoryRow {id:string;owner:string;process:string;state:AssistantTicket['state'];created:number;expires:number;lease:number;started?:number;completed?:number;error?:string;seq:number}
// Local queued-fake mode and deterministic tests only. Paid public calls require SupabaseLedger.
export class MemoryLedger implements Ledger {
 rows=new Map<string,MemoryRow>();charges=new Map<string,{day:string;amount:number;settled:boolean}>();next=0;blocked=false;sequence=0;
 constructor(public now:()=>number=Date.now){}
 async action(action:Action,id:string,owner:string,process:string,usage?:{input?:number;output?:number;error?:string}):Promise<LedgerView>{
  const now=this.now(),day=new Date(now).toISOString().slice(0,10);
  if(this.blocked)return {error:'assistant_unavailable'};
  for(const r of this.rows.values()){
   if(r.state==='queued'&&(r.lease<=now||r.expires<=now))r.state='expired';
   if(r.state==='running'&&r.lease<=now){r.state='failed';r.error='assistant_unavailable';r.completed=now;}
   if(r.state==='completed'&&r.expires<=now)r.state='expired';
  }
  const spent=()=>[...this.charges.values()].filter(x=>x.day===day).reduce((n,x)=>n+x.amount,0);
  const budget=():LedgerView=>({error:'assistant_budget_exhausted',resetsAt:new Date(Date.parse(`${day}T00:00:00Z`)+86400000).toISOString()});
  let r=this.rows.get(id);
  if(r&&r.owner!==owner)return {error:'assistant_request_expired'};
  if(!r){
   if(action!=='admit')return {error:'assistant_request_expired'};
   if(spent()+WCS_NANO>DAILY_NANO)return budget();
   if([...this.rows.values()].some(x=>x.owner===owner&&['queued','running'].includes(x.state)))return {error:'assistant_already_pending'};
   const waiting=[...this.rows.values()].filter(x=>x.state==='queued').length;
   if(waiting>=12||Math.max(0,this.next-now)+waiting*SLOT_MS>600000)return {error:'assistant_queue_full'};
   r={id,owner,process,state:'queued',created:now,expires:now+600000,lease:now+60000,seq:++this.sequence};this.rows.set(id,r);
  }
  if(action==='claim'){
   if(r.process!==process||r.state!=='queued'||this.next>now||[...this.rows.values()].some(x=>x.state==='running'||(x.state==='queued'&&x.seq<r!.seq)))return {claimed:false,state:r.state,retryAt:new Date(Math.max(this.next,now+1000)).toISOString()};
   if(spent()+WCS_NANO>DAILY_NANO){for(const x of this.rows.values())if(x.state==='queued'){x.state='failed';x.error='assistant_budget_exhausted';x.completed=now;}return budget();}
   this.charges.set(id,{day,amount:WCS_NANO,settled:false});this.next=now+SLOT_MS;r.state='running';r.started=now;r.lease=now+15000;return {claimed:true};
  }
  if(action==='finish'&&r.process===process&&r.state==='running'){
   let error=usage?.error;
   const input=usage?.input,output=usage?.output;
   if(input!==undefined&&output!==undefined){
    if(input<0||input>4000||output<0||output>800){this.blocked=true;error='assistant_unavailable';}
    else {const charge=this.charges.get(id)!;if(!charge.settled){charge.amount=input*50+output*400;charge.settled=true;}}
   }
   r.state=error?'failed':'completed';r.error=error;r.completed=now;r.expires=now+300000;
  }
  if(action==='cancel'&&r.state==='queued')r.state='cancelled';
  if(action==='get'&&r.state==='queued')r.lease=now+60000;
  const recent=[...this.rows.values()].filter(x=>x.completed!==undefined&&x.started!==undefined&&!x.error&&['completed','expired'].includes(x.state)&&x.completed>=now-900000).sort((a,b)=>b.completed!-a.completed!).slice(0,100);
  const average=recent.length>=5?Math.ceil(recent.reduce((n,x)=>n+x.completed!-x.created,0)/recent.length/1000):undefined;
  const service=recent.length>=5?recent.reduce((n,x)=>n+x.completed!-x.started!,0)/recent.length/1000:8;
  const position=r.state==='queued'?[...this.rows.values()].filter(x=>x.state==='queued'&&x.seq<r!.seq).length+1:undefined;
  const wait=position?Math.max(0,this.next-now)/1000+(position-1)*45:0;
  return {requestId:id,state:r.state,processId:r.process,position,estimatedWaitSeconds:Math.ceil(wait),estimatedReplySeconds:Math.ceil(wait+service),recentAverageReplySeconds:average,estimateUpdatedAt:new Date(now).toISOString(),pollAfterSeconds:3,error:r.error};
 }
}
interface Pending {owner:string;messages?:ProviderMessage[];result?:ProviderResult;created:number;done?:number;next:number;leaseUntil:number}
export class AssistantQueue {
 readonly process=randomUUID();private jobs=new Map<string,Pending>();private ticking=false;private timer?:ReturnType<typeof setInterval>;
 constructor(private ledger:Ledger,private provider:(m:ProviderMessage[])=>Promise<ProviderResult>=callAssistant,options:{timers?:boolean}={}){
  if(options.timers===false)return;
  this.timer=setInterval(()=>void this.tick().catch(()=>{}),1000);this.timer.unref();
 }
 close(){clearInterval(this.timer);this.jobs.clear();}
 async submit(id:string,cap:string,messages:ProviderMessage[]){
  const owner=hashCapability(cap);const view=await this.ledger.action('admit',id,owner,this.process);
  if(!view.error&&view.state==='queued'&&view.processId===this.process&&!this.jobs.has(id))this.jobs.set(id,{owner,messages,created:Date.now(),leaseUntil:Date.now()+60000,next:Date.now()+(view.estimatedWaitSeconds??0)*1000});
  return this.present(id,view);
 }
 async status(id:string,cap:string,cancel=false){
  const owner=hashCapability(cap);const view=await this.ledger.action(cancel?'cancel':'get',id,owner,this.process);
  const job=this.jobs.get(id);
  if(job?.owner===owner&&view.state==='queued'&&!cancel){job.leaseUntil=Date.now()+60000;job.next=Date.now()+(view.estimatedWaitSeconds??0)*1000;}
  if(job?.owner===owner&&['cancelled','expired','failed'].includes(view.state??'')){job.messages=undefined;job.done=Date.now();}
  return this.present(id,view);
 }
 private present(id:string,view:LedgerView):AssistantTicket{
  if(view.error&&!view.state)throw Object.assign(new Error(view.error),{resetsAt:view.resetsAt});
  const {processId,...safe}=view;
  const job=this.jobs.get(id);
  if(view.state==='completed'&&!job)throw new Error('assistant_request_expired');
  if(['queued','running','completed'].includes(view.state??'')&&(processId!==this.process||!job))throw new Error(processId===this.process?'assistant_request_expired':'assistant_unavailable');
  return {...safe,...(view.state==='completed'&&job?.result?{reply:job.result.reply,disclaimer:true as const,mode:job.result.mode,...(job.result.candidate?{candidate:job.result.candidate}:{})}:{}),requestId:id,state:view.state!,pollAfterSeconds:3};
 }
 async tick(){
  if(this.ticking)return;this.ticking=true;
  try{
   for(const [id,j]of this.jobs){if(j.done&&Date.now()-j.done>300000)this.jobs.delete(id);if(j.messages&&Date.now()>j.leaseUntil){j.messages=undefined;j.done=Date.now();await this.ledger.action('cancel',id,j.owner,this.process);}}
   const entry=[...this.jobs.entries()].find(([,j])=>j.messages&&j.next<=Date.now());if(!entry)return;
   const [id,job]=entry;const claim=await this.ledger.action('claim',id,job.owner,this.process);
   if(!claim.claimed){job.next=claim.retryAt?Date.parse(claim.retryAt):Date.now()+3000;if(claim.error||claim.state&&claim.state!=='queued'){job.messages=undefined;job.done=Date.now();}return;}
   const messages=job.messages!;job.messages=undefined;
   let usage:{input?:number;output?:number;error?:string};
   try{job.result=await this.provider(messages);usage={input:job.result.input,output:job.result.output};}
   catch(e){usage={error:e instanceof Error&&e.message==='assistant_timeout'?'assistant_timeout':'assistant_unavailable'};}
   job.done=Date.now();await this.ledger.action('finish',id,job.owner,this.process,usage);
  }finally{this.ticking=false;}
 }
}
export const hashCapability=(s:string)=>createHash('sha256').update(s).digest('hex');
export function conversationCapability(header:unknown){
 const match=typeof header==='string'?header.match(/^Bearer ([a-f0-9]{64})$/i):null;
 if(!match)throw new Error('validation_error');return match[1];
}
