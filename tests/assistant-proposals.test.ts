import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import {setTimeout as pause} from 'node:timers/promises';
import {ProposalStore,cartSnapshot,explicitThreeCheeseCandidate} from '../apps/api/src/assistant-proposals.ts';
import {prepareAssistant,inputTokens} from '../apps/api/src/assistant-provider.ts';
import {flavors,type CartLine,type CartSnapshot} from '../packages/contracts/src/index.ts';
import {sqlDatabase,rpcFixture,startApi,listen} from './helpers.ts';
const line:CartLine={flavorId:'calabresa',sizeId:'grande',crustId:'traditional',removedIngredientIds:['onion'],extraToppingIds:['bacon'],quantity:1};
const menu={signature:'menu-v1',availableIds:flavors.map(f=>f.id)};
const snapshot=(lines:CartSnapshot['lines']=[]):CartSnapshot=>({revision:1,fulfillment:'pickup',lines});
const cap='a'.repeat(64);
test('an explicit three-cheese Quatro Queijos request resolves to the omitted ingredient',()=>{
 const proposalMenu={flavors:[{id:'quatro_queijos',name:'Quatro Queijos',ingredients:[{id:'mozzarella',name:'Muçarela'},{id:'provolone',name:'Provolone'},{id:'parmesan',name:'Parmesão'},{id:'gorgonzola',name:'Gorgonzola'}]}]};
 assert.deepEqual(explicitThreeCheeseCandidate('Opção A, com provolone, parmesão e gorgonzola. Média. Qualquer borda.',proposalMenu),{operation:'add',targetLineId:null,line:{flavorId:'quatro_queijos',sizeId:'media',crustId:'traditional',removedIngredientIds:['mozzarella'],extraToppingIds:[],quantity:1}});
 assert.deepEqual(explicitThreeCheeseCandidate('Option A with provolone, parmesan, and gorgonzola. Medium. Any crust.',{flavors:[{id:'quatro_queijos',name:'Four Cheese',ingredients:[{id:'mozzarella',name:'Mozzarella'},{id:'provolone',name:'Provolone'},{id:'parmesan',name:'Parmesan'},{id:'gorgonzola',name:'Gorgonzola'}]}]}),{operation:'add',targetLineId:null,line:{flavorId:'quatro_queijos',sizeId:'media',crustId:'traditional',removedIngredientIds:['mozzarella'],extraToppingIds:[],quantity:1}});
 assert.equal(explicitThreeCheeseCandidate('Quero uma pizza de três queijos, média.',proposalMenu),undefined);
 assert.equal(explicitThreeCheeseCandidate('Provolone, parmesão e gorgonzola.',proposalMenu),undefined);
});
for(const locale of ['pt-BR','en-US'] as const){
 test(`proposals validate add, update, quantity, removal, merges, replay and ownership (${locale})`,async()=>{
  const store=new ProposalStore();const id=randomUUID(),base=snapshot([{...line,lineId:'first',quantity:2}]);
  store.register(id,cap,base,locale);
  const proposal=(await store.present(id,cap,{operation:'add',targetLineId:null,line},menu))!;
  assert.equal(proposal.lines.length,1);assert.equal(proposal.lines[0].quantity,3);assert.equal(proposal.quote.total,20700);
  assert.equal(proposal.lines[0].lineId,'first');assert.equal(base.lines[0].quantity,2);
  const first=store.confirm(proposal.id,cap,base,menu);assert.deepEqual(store.confirm(proposal.id,cap,base,menu),first);
  assert.throws(()=>store.confirm(proposal.id,'b'.repeat(64),base,menu),/proposal_expired/);
  assert.throws(()=>store.confirm(proposal.id,cap,{...base,revision:2},menu),/proposal_stale/);
  assert.throws(()=>store.confirm(proposal.id,cap,base,{...menu,signature:'changed-price'}),/proposal_stale/);
  assert.throws(()=>store.confirm(proposal.id,cap,base,{...menu,availableIds:[]}),/proposal_stale/);
  const second={...line,lineId:'unrelated',sizeId:'broto' as const};
  for(const operation of ['update','remove'] as const){
   const next=randomUUID(),cart=snapshot([{...line,lineId:'first'},second]);store.register(next,cap,cart,locale);
   const p=(await store.present(next,cap,{operation,targetLineId:'first',line:operation==='remove'?null:{...line,quantity:2,crustId:'thin'}},menu))!;
   assert.deepEqual(p.lines.find(l=>l.lineId==='unrelated'),second);
   assert.equal(p.lines.find(l=>l.lineId==='first')?.quantity,operation==='remove'?undefined:2);
  }
 });
}
test('proposal expiry, restart, invalid fields/targets, limits and dismissal fail closed',async()=>{
 let now=0;const store=new ProposalStore(()=>now);
 const add=async(candidate:any,base=snapshot())=>{const id=randomUUID();store.register(id,cap,base,'en-US');return store.present(id,cap,candidate,menu)};
 await assert.rejects(add({operation:'submit_order',targetLineId:null,line}),/proposal_invalid/);
 await assert.rejects(add({operation:'update',targetLineId:'missing',line}),/proposal_invalid/);
 await assert.rejects(add({operation:'add',targetLineId:null,line:{...line,unitPrice:1}}),/proposal_invalid/);
 await assert.rejects(add({operation:'add',targetLineId:null,line:{...line,flavorId:'invented'}}));
 await assert.rejects(add({operation:'add',targetLineId:null,line:{...line,quantity:10}},snapshot([{...line,lineId:'first'}])),/proposal_invalid/);
 assert.throws(()=>cartSnapshot({...snapshot(),lines:[{...line,lineId:'a'},{...line,lineId:'a'}]}),/proposal_invalid/);
 const p=(await add({operation:'add',targetLineId:null,line}))!;
 assert.throws(()=>new ProposalStore().confirm(p.id,cap,snapshot(),menu),/proposal_expired/);
 store.discard(p.id,cap);assert.throws(()=>store.confirm(p.id,cap,snapshot(),menu),/proposal_expired/);
 const expired=(await add({operation:'add',targetLineId:null,line}))!;now+=300001;assert.throws(()=>store.confirm(expired.id,cap,snapshot(),menu),/proposal_expired/);
 const removeStore=new ProposalStore();const id=randomUUID();const base=snapshot([{...line,lineId:'one'}]);removeStore.register(id,cap,base,'en-US');
 const last=(await removeStore.present(id,cap,{operation:'remove',targetLineId:'one',line:null},menu))!;assert.equal(last.quote.total,0);assert.deepEqual(last.lines,[]);
});
test('structured prompt and schema stay within the unchanged full input budget',()=>{
 const messages=prepareAssistant('pt-BR',[], 'Quero uma calabresa grande sem cebola com bacon',{cartSnapshot:snapshot(),proposalMenu:{flavors}});
 assert.ok(messages[0].content.includes('CART_PROPOSALS_V1'));assert.ok(inputTokens(messages)<=4000);
});
test('queued structured provider proposal confirms without another paid call and rejects stale/cross-conversation carts',async t=>{
 const db=await sqlDatabase();t.after(()=>db.close());const url=await rpcFixture(t,db);let calls=0;
 const provider=createServer(async(req,res)=>{
  let raw='';for await(const chunk of req)raw+=chunk;const input=JSON.parse(raw);calls++;
  assert.equal(input.response_format.type,'json_schema');assert.equal(input.max_completion_tokens,800);assert.ok(inputTokens(input.messages)<=4000);
  res.setHeader('content-type','application/json');res.end(JSON.stringify({choices:[{message:{content:JSON.stringify({reply:'Review this proposed pizza before applying.',candidate:{operation:'add',targetLineId:null,line}})}}],usage:{prompt_tokens:1200,completion_tokens:150}}));
 });const port=await listen(provider);t.after(()=>new Promise<void>(r=>provider.close(()=>r())));
 const origin=await startApi(t,{SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:'fixture',ASSISTANT_PROVIDER:'openai-compatible',ASSISTANT_API_URL:`http://127.0.0.1:${port}`,ASSISTANT_API_KEY:'fixture'});
 const headers={'content-type':'application/json',authorization:`Bearer ${cap}`};const id=randomUUID();const base=snapshot();
 const request={requestId:id,locale:'en-US',message:'A large Calabresa without onion with bacon',history:[],context:{screen:'menu',cartSnapshot:base}};
 let r=await fetch(origin+'/assistant/messages',{method:'POST',headers,body:JSON.stringify(request)});assert.equal(r.status,202);
 let ticket:any;for(let i=0;i<40;i++){await pause(100);ticket=await(await fetch(origin+'/assistant/requests/'+id,{headers})).json();if(ticket.state==='completed')break;}
 assert.equal(ticket.state,'completed');assert.equal(ticket.candidate,undefined);assert.ok(ticket.proposal);assert.match(ticket.reply,/I prepared this proposal: 1 × Calabresa · Large/);assert.match(ticket.reply,/cart has not changed/i);assert.equal(calls,1);
 const path=origin+'/assistant/proposals/'+ticket.proposal.id+'/confirm';
 const confirm=(cart=base,h=headers)=>fetch(path,{method:'POST',headers:h,body:JSON.stringify({cartSnapshot:cart})});
 r=await confirm();assert.equal(r.status,200);const result=await r.json();assert.deepEqual((await(await confirm()).json() as any),result);
 assert.equal((await confirm({...base,revision:2})).status,409);
 assert.equal((await confirm(base,{...headers,authorization:`Bearer ${'b'.repeat(64)}`})).status,410);
 assert.equal((await db.query('select * from assistant_attempts')).rows.length,1);assert.equal(calls,1);
 assert.equal((await db.query('select * from demo_orders')).rows.length,0);
});
test('invalid structured proposal replaces the model promise with localized recovery guidance',async t=>{
 const db=await sqlDatabase();t.after(()=>db.close());const url=await rpcFixture(t,db);
 const provider=createServer(async(_req,res)=>{
  res.setHeader('content-type','application/json');res.end(JSON.stringify({choices:[{message:{content:JSON.stringify({reply:'I prepared your pizza and added it to the cart.',candidate:{operation:'add',targetLineId:null,line:{...line,removedIngredientIds:['not-an-ingredient']}}})}}],usage:{prompt_tokens:1000,completion_tokens:100}}));
 });const port=await listen(provider);t.after(()=>new Promise<void>(r=>provider.close(()=>r())));
 const origin=await startApi(t,{SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:'fixture',ASSISTANT_PROVIDER:'openai-compatible',ASSISTANT_API_URL:`http://127.0.0.1:${port}`,ASSISTANT_API_KEY:'fixture'});
 const headers={'content-type':'application/json',authorization:`Bearer ${cap}`},id=randomUUID();
 const request={requestId:id,locale:'pt-BR',message:'Crie essa pizza',history:[],context:{screen:'cart',cartSnapshot:snapshot()}};
 assert.equal((await fetch(origin+'/assistant/messages',{method:'POST',headers,body:JSON.stringify(request)})).status,202);
 let ticket:any;for(let i=0;i<40;i++){await pause(100);ticket=await(await fetch(origin+'/assistant/requests/'+id,{headers})).json();if(ticket.state==='completed')break;}
 assert.equal(ticket.state,'completed');assert.equal(ticket.proposalError,'proposal_invalid');assert.equal(ticket.proposal,undefined);
 assert.match(ticket.reply,/Não consegui validar essa configuração/);assert.match(ticket.reply,/sacola continua igual/);assert.doesNotMatch(ticket.reply,/adicionada|preparei sua pizza/i);
});
test('explicit three-cheese follow-up creates a proposal even when the model omits the candidate',async t=>{
 const db=await sqlDatabase();t.after(()=>db.close());const url=await rpcFixture(t,db);let calls=0;
 const provider=createServer(async(_req,res)=>{calls++;res.setHeader('content-type','application/json');res.end(JSON.stringify({choices:[{message:{content:JSON.stringify({reply:'Não posso alterar os ingredientes da Quatro Queijos.',candidate:null})}}],usage:{prompt_tokens:1200,completion_tokens:100}}));});
 const port=await listen(provider);t.after(()=>new Promise<void>(r=>provider.close(()=>r())));
 const origin=await startApi(t,{SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:'fixture',ASSISTANT_PROVIDER:'openai-compatible',ASSISTANT_API_URL:`http://127.0.0.1:${port}`,ASSISTANT_API_KEY:'fixture'});
 const headers={'content-type':'application/json',authorization:`Bearer ${cap}`},id=randomUUID();
 const request={requestId:id,locale:'pt-BR',message:'Opção A, com provolone, parmesão e gorgonzola. Média. Qualquer borda.',history:[],context:{screen:'cart',cartSnapshot:snapshot()}};
 assert.equal((await fetch(origin+'/assistant/messages',{method:'POST',headers,body:JSON.stringify(request)})).status,202);
 let ticket:any;for(let i=0;i<40;i++){await pause(100);ticket=await(await fetch(origin+'/assistant/requests/'+id,{headers})).json();if(ticket.state==='completed')break;}
 assert.equal(ticket.state,'completed');assert.equal(ticket.proposalError,undefined);assert.equal(ticket.proposal.candidate.line.flavorId,'quatro_queijos');
 assert.equal(ticket.proposal.candidate.line.sizeId,'media');assert.deepEqual(ticket.proposal.candidate.line.removedIngredientIds,['mozzarella']);
 assert.match(ticket.reply,/Quatro Queijos · Média/);assert.match(ticket.reply,/A sacola não mudou/);assert.equal(calls,1);
});
