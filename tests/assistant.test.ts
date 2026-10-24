import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import {setTimeout as pause} from 'node:timers/promises';
import {sqlDatabase,startApi,rpcFixture,listen} from './helpers.ts';
import {prepareAssistant,inputTokens,scrubPersonalData} from '../apps/api/src/assistant-provider.ts';
import {MemoryLedger,AssistantQueue,WCS_NANO,DAILY_NANO} from '../apps/api/src/assistant-queue.ts';

test('token accounting bounds full provider prompt, preserves rules and removes oldest history',()=>{
 const history=Array.from({length:10},(_,i)=>({role:'user' as const,content:`turn-${i} `+'pizza '.repeat(600)}));
 const messages=prepareAssistant('pt-BR',history,'quero uma grande sem cebola',{menu:['Calabresa'],quote:{totalBRLCents:4900}});
 assert.ok(inputTokens(messages)<=4000);assert.equal(messages[0].role,'system');assert.match(messages[0].content,/cannot change a cart/);
 assert.match(messages.at(-1)!.content,/sem cebola/);assert.doesNotMatch(JSON.stringify(messages),/turn-0 /);
 assert.throws(()=>prepareAssistant('en-US',[],'pizza '.repeat(5000),{}),/assistant_input_too_large/);
 const redacted=scrubPersonalData('My name is Private Person. me chamo Pessoa Privada. user@example.com 11999999999 LS-ABCDEFG Rua Exemplo 123');
 assert.doesNotMatch(redacted,/Private Person|Pessoa Privada|example.com|11999999999|LS-ABCDEFG|Exemplo/);
});

test('memory ledger caps FIFO, retries, cancellation, unknown charges, midnight and rolling averages',async()=>{
 let now=Date.parse('2026-10-24T23:59:30Z');const ledger=new MemoryLedger(()=>now);const process=randomUUID();
 const id=randomUUID();assert.equal((await ledger.action('admit',id,'a',process)).position,1);
 assert.equal((await ledger.action('admit',id,'a',process)).position,1);
 assert.equal((await ledger.action('get',id,'wrong',process)).error,'assistant_request_expired');
 assert.equal((await ledger.action('admit',randomUUID(),'a',process)).error,'assistant_already_pending');
 assert.equal((await ledger.action('claim',id,'a',process)).claimed,true);
 const second=randomUUID();await ledger.action('admit',second,'b',process);
 assert.equal((await ledger.action('claim',second,'b',process)).claimed,false);
 now+=8000;await ledger.action('finish',id,'a',process,{error:'assistant_timeout'});
 assert.equal(ledger.charges.get(id)!.amount,WCS_NANO);
 now=Date.parse('2026-10-25T00:00:00Z');assert.equal((await ledger.action('claim',second,'b',process)).claimed,false);
 now+=15000;assert.equal((await ledger.action('claim',second,'b',process)).claimed,true);
 await ledger.action('finish',second,'b',process,{input:100,output:50});
 assert.equal(ledger.charges.get(second)!.amount,25000);
 await ledger.action('finish',second,'b',process,{input:0,output:0});assert.equal(ledger.charges.get(second)!.amount,25000);
 const cancelled=randomUUID();await ledger.action('admit',cancelled,'c',process);await ledger.action('cancel',cancelled,'c',process);
 assert.equal(ledger.charges.has(cancelled),false);
 const waiting=[];for(let i=0;i<12;i++){const id=randomUUID();waiting.push(id);await ledger.action('admit',id,`owner${i}`,process);}
 assert.equal((await ledger.action('admit',randomUUID(),'overflow',process)).error,'assistant_queue_full');
 now+=61000;assert.equal((await ledger.action('get',waiting[0],'owner0',process)).state,'expired');
 ledger.charges.set(randomUUID(),{day:'2026-10-25',amount:DAILY_NANO,settled:true});
 assert.equal((await ledger.action('admit',randomUUID(),'budget',process)).error,'assistant_budget_exhausted');
});

test('real PostgreSQL queue migration enforces atomic reservations, private RPCs, restart-safe slots and settlement',async t=>{
 const db=await sqlDatabase();t.after(()=>db.close());const process=randomUUID(),nextProcess=randomUUID();let now=Date.parse('2026-10-24T23:59:30Z');
 const action=async(action:string,id:string,owner:string,p=process,input:number|null=null,output:number|null=null,error:string|null=null)=>{
  const {rows}=await db.query<{value:any}>('select assistant_action($1,$2,$3,$4,$5,$6,$7,$8) value',[action,id,owner,p,input,output,error,new Date(now).toISOString()]);return rows[0].value;
 };
 const a=randomUUID(),b=randomUUID();await action('admit',a,'owner-a');await action('admit',b,'owner-b',nextProcess);
 const claims=await Promise.all([action('claim',a,'owner-a'),action('claim',b,'owner-b',nextProcess)]);
 assert.equal(claims.filter(x=>x.claimed).length,1);
 assert.equal((await db.query('select charge_nano from assistant_attempts')).rows.length,1);
 now+=8000;await action('finish',a,'owner-a',process,null,null,'assistant_timeout');
 assert.equal((await db.query<{charge_nano:number}>('select charge_nano from assistant_attempts')).rows[0].charge_nano,520000);
 now=Date.parse('2026-10-25T00:00:00Z');assert.equal((await action('claim',b,'owner-b',nextProcess)).claimed,false);
 now+=15000;assert.equal((await action('claim',b,'owner-b',nextProcess)).claimed,true);
 await action('finish',b,'owner-b',nextProcess,4000,800);await action('finish',b,'owner-b',nextProcess,0,0);
 assert.equal((await db.query<{charge_nano:number}>('select charge_nano from assistant_attempts where id=$1',[b])).rows[0].charge_nano,520000);
 const c=randomUUID();await action('admit',c,'c');assert.equal((await action('get',c,'intruder')).error,'assistant_request_expired');
 await action('cancel',c,'c');assert.equal((await db.query('select * from assistant_attempts where id=$1',[c])).rows.length,0);
 // Existing reservations survive process loss. Repeated IDs cannot replay a paid call.
 assert.equal((await action('admit',b,'owner-b',randomUUID())).state,'completed');
 await db.exec('set role anon');await assert.rejects(db.query("select assistant_action('get',$1,'c',$2)",[c,process]),/permission denied/);await db.exec('reset role');
 const metadata=(await db.query('select * from assistant_tickets')).rows;assert.ok(metadata.every(x=>!('message' in x)&&!('reply' in x)));
});

test('SQL daily cap includes every reserved/unknown attempt and rejects overspend',async t=>{
 const db=await sqlDatabase();t.after(()=>db.close());
 const p=randomUUID();const base=Date.parse('2026-10-24T00:00:00Z');
 // Reserve 1,923 WCS attempts in a day (1923 * .00052 < $1), then refuse the next.
 // Slot pacing is independently checked above; seed accounting to hit the budget boundary efficiently.
 await db.query("insert into assistant_tickets(id,owner_hash,process_id,state,created_at,expires_at) select gen_random_uuid(),'owner', $1,'failed',$2,$2 from generate_series(1,1923)",[p,new Date(base).toISOString()]);
 await db.query("insert into assistant_attempts(id,accounting_day,charge_nano) select id,'2026-10-24',520000 from assistant_tickets");
 const {rows}=await db.query<{value:any}>("select assistant_action('admit',$1,'new',$2,p_now=>$3) value",[randomUUID(),p,new Date(base).toISOString()]);
 assert.equal(rows[0].value.error,'assistant_budget_exhausted');
});

test('queue preserves running cost when the provider fails and cancels waiting work without a call',async t=>{
 const ledger=new MemoryLedger();let calls=0;const q=new AssistantQueue(ledger,async()=>{calls++;throw new Error('assistant_timeout');});t.after(()=>q.close());
 const cap='a'.repeat(64),id=randomUUID();await q.submit(id,cap,[]);await q.tick();
 assert.equal((await q.status(id,cap)).error,'assistant_timeout');assert.equal(calls,1);assert.equal(ledger.charges.get(id)!.amount,WCS_NANO);
 const next=randomUUID();await q.submit(next,cap,[]);await q.status(next,cap,true);await q.tick();assert.equal(calls,1);
});

test('API queues the real adapter against controlled PostgreSQL/provider fixtures without leaking personal context',async t=>{
 const db=await sqlDatabase();t.after(()=>db.close());const supabase=await rpcFixture(t,db);
 let calls=0;const provider=createServer(async(req,res)=>{
  let raw='';for await(const c of req)raw+=c;const body=JSON.parse(raw);calls++;
  assert.equal(body.model,'gpt-5-nano-2025-08-07');assert.equal(body.store,false);assert.equal(body.reasoning_effort,'minimal');assert.equal(body.max_completion_tokens,800);assert.equal(body.temperature,undefined);assert.equal(body.max_tokens,undefined);
  assert.doesNotMatch(raw,/PRIVATE_PERSON|example.com|11999999999|LS-PRIVATE|secret-fixture/);
  assert.ok(inputTokens(body.messages)<=4000);
  res.setHeader('content-type','application/json');res.end(JSON.stringify({choices:[{message:{content:'Use the crust controls to choose a thin crust.'}}],usage:{prompt_tokens:300,completion_tokens:50,completion_tokens_details:{reasoning_tokens:20}}}));
 });const providerPort=await listen(provider);t.after(()=>new Promise<void>(r=>provider.close(()=>r())));
 const origin=await startApi(t,{SUPABASE_URL:supabase,SUPABASE_SERVICE_ROLE_KEY:'fixture-service-key',ASSISTANT_PROVIDER:'openai-compatible',ASSISTANT_API_URL:`http://127.0.0.1:${providerPort}`,ASSISTANT_API_KEY:'secret-fixture'});
 const id=randomUUID(),headers={'content-type':'application/json',authorization:`Bearer ${'b'.repeat(64)}`};
 const payload={requestId:id,locale:'en-US',message:'My name is PRIVATE_PERSON. example@example.com 11999999999 LS-PRIVATE How do I choose thin crust?',history:[],context:{screen:'menu',customer:{name:'PRIVATE_PERSON'},price:1}};
 const submit=await fetch(`${origin}/assistant/messages`,{method:'POST',headers,body:JSON.stringify(payload)});assert.equal(submit.status,202);assert.equal((await submit.json() as any).state,'queued');
 const duplicate=await fetch(`${origin}/assistant/messages`,{method:'POST',headers,body:JSON.stringify(payload)});assert.equal(duplicate.status,202);
 let body:any;for(let i=0;i<40;i++){await pause(100);const r=await fetch(`${origin}/assistant/requests/${id}`,{headers});body=await r.json();if(body.state==='completed')break;}
 assert.equal(body.state,'completed');assert.match(body.reply,/thin crust/);assert.equal(body.processId,undefined);assert.equal(calls,1);
 const wrong=await fetch(`${origin}/assistant/requests/${id}`,{headers:{authorization:`Bearer ${'c'.repeat(64)}`}});assert.equal(wrong.status,410);
 assert.equal((await db.query<{charge_nano:number}>('select charge_nano from assistant_attempts')).rows[0].charge_nano,35000);
});

test('recent averages include waiting, require five samples, and preserve measured service time',async t=>{
 const db=await sqlDatabase();t.after(()=>db.close());const process=randomUUID();let now=Date.parse('2026-10-24T12:00:00Z');
 const action=async(a:string,id:string,owner:string,input:number|null=null,output:number|null=null)=>{
  const r=await db.query<{value:any}>('select assistant_action($1,$2,$3,$4,$5,$6,p_now=>$7) value',[a,id,owner,process,input,output,new Date(now).toISOString()]);return r.rows[0].value;
 };
 for(let i=0;i<5;i++){
  const id=randomUUID();const v=await action('admit',id,`owner${i}`);assert.equal(v.recentAverageReplySeconds,undefined);
  now+=5000;await action('claim',id,`owner${i}`);now+=2000;await action('finish',id,`owner${i}`,100,50);now+=38000;
 }
 const id=randomUUID(),view=await action('admit',id,'next');assert.equal(view.recentAverageReplySeconds,7);assert.equal(view.estimatedReplySeconds,7);
});

test('model wording guard rejects action offers without blocking advice or refusals',async()=>{
 const {guardReply}=await import('../apps/api/src/assistant-provider.ts');
 assert.doesNotMatch(guardReply('Would you like me to add Bacon as an extra?','en-US'),/like me to add/);
 assert.doesNotMatch(guardReply('Posso adicionar bacon ao seu pedido?','pt-BR'),/Posso adicionar/);
 assert.equal(guardReply('Use the crust controls to choose thin crust.','en-US'),'Use the crust controls to choose thin crust.');
 assert.equal(guardReply('Não posso adicionar nada ao pedido.','pt-BR'),'Não posso adicionar nada ao pedido.');
});
