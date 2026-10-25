import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {MemoryKitchen,stageDelay} from '../apps/api/src/kitchen-simulation.ts';
import {staffMessage,calculate,type Status,type CartLine} from '../packages/contracts/src/index.ts';
import {sqlDatabase,rpcFixture,startApi} from './helpers.ts';
const line:CartLine={flavorId:'calabresa',sizeId:'media',crustId:'traditional',removedIngredientIds:['onion'],extraToppingIds:['bacon'],quantity:2};
const order=(fulfillment:'pickup'|'delivery'='pickup',code=`LS-${randomUUID().replaceAll('-','').toUpperCase()}`)=>({orderCode:code,createdAt:'2026-10-24T12:00:00.000Z',updatedAt:'2026-10-24T12:00:00.000Z',status:'received' as Status,statusKey:'status.received',locale:'pt-BR',fulfillment,...calculate([line],fulfillment),demoOnly:true});
test('fresh database grants API menu/order access and denies direct public table access',async t=>{
 const db=await sqlDatabase();t.after(()=>db.close());
 // Supabase service_role bypasses RLS, but still needs explicit SQL table grants.
 await db.exec('alter role service_role bypassrls;set role service_role;');
 assert.equal((await db.query('select * from demo_menu where available')).rows.length,5);
 const o=order();
 await db.query('select create_public_demo_order($1,$2,$3,$4)',[o.orderCode,randomUUID(),'synthetic-payload',JSON.stringify(o)]);
 assert.equal((await db.query('select order_code from demo_orders where order_code=$1',[o.orderCode])).rows.length,1);
 await db.exec('reset role');
 for(const role of ['anon','authenticated']){
  await db.exec(`set role ${role}`);
  for(const table of ['demo_menu','demo_orders']){
   await assert.rejects(db.query(`select * from ${table}`),/permission denied/);
   await assert.rejects(db.query(`truncate ${table} cascade`),/permission denied/);
  }
  await db.exec('reset role');
 }
});
test('memory fake staff use bounded times, one transition per tick, terminal stop, safe bilingual dialogue and expiry',()=>{
 let now=Date.parse('2026-10-24T12:00:00Z');const orders=new Map();const kitchen=new MemoryKitchen(orders,()=>now,()=>0);
 for(const fulfillment of ['pickup','delivery'] as const){const o=order(fulfillment);kitchen.initialize(o);orders.set(o.orderCode,o);}
 assert.equal(kitchen.tick(),0);now+=5000;assert.equal(kitchen.tick(),2);assert.equal(kitchen.events.length,4);
 assert.equal(kitchen.tick(),0);now+=5000;kitchen.tick();assert.equal([...orders.values()][0].status,'preparing');
 now+=30000;kitchen.tick();assert.deepEqual([...orders.values()].map(o=>o.status),['ready_for_pickup','out_for_delivery']);
 now+=60000;kitchen.tick();assert.ok([...orders.values()].every(o=>o.status==='completed'));assert.equal(kitchen.events.length,16);kitchen.tick();assert.equal(kitchen.events.length,16);
 for(const e of kitchen.events){assert.ok(staffMessage(e,'pt-BR').length>10);assert.ok(staffMessage(e,'en-US').length>10);assert.doesNotMatch(JSON.stringify(e),/phone|address|customer|payload/);}
 assert.equal(stageDelay('preparing',()=>0),30000);assert.equal(stageDelay('preparing',()=>1),90000);
 now+=86400000;kitchen.cleanup();assert.equal(orders.size,0);assert.equal(kitchen.events.length,0);
});
test('real PostgreSQL simulation persists timing, CAS transitions, events, source isolation and 24h cleanup',async t=>{
 const db=await sqlDatabase();t.after(()=>db.close());let now=Date.parse('2026-10-24T12:00:00Z');
 const codes=[];
 for(const fulfillment of ['pickup','delivery'] as const){
  const o=order(fulfillment);codes.push(o.orderCode);
  const {rows}=await db.query<{value:any}>('select create_public_demo_order($1,$2,$3,$4,0,$5) value',[o.orderCode,randomUUID(),'synthetic-payload',JSON.stringify(o),new Date(now).toISOString()]);assert.equal(rows[0].value.order.status,'received');
 }
 await db.query("insert into demo_orders(order_code,idempotency_key,payload,order_data) values('LS-PRIVATE','private-key','PRIVATE_ADDRESS',$1)",[JSON.stringify(order())]);
 const tick=async()=>db.query<{value:number}>('select advance_demo_kitchen($1,0) value',[new Date(now).toISOString()]);
 const snapshot=async()=> (await db.query<{value:any}>('select public_kitchen_snapshot(p_now=>$1) value',[new Date(now).toISOString()])).rows[0].value;
 assert.equal((await snapshot()).orders.length,2);assert.doesNotMatch(JSON.stringify(await snapshot()),/LS-PRIVATE|PRIVATE_ADDRESS/);
 assert.equal((await tick()).rows[0].value,0);
 now+=5000;await Promise.all([tick(),tick()]);assert.equal((await snapshot()).messages.length,4);
 assert.ok((await snapshot()).orders.every((o:any)=>o.status==='confirmed'));
 // A restart reads the persisted next-due time; one overdue pass cannot fast-forward.
 now+=120000;await tick();assert.ok((await snapshot()).orders.every((o:any)=>o.status==='preparing'));assert.equal((await tick()).rows[0].value,0);
 now+=30000;await tick();assert.deepEqual(new Set((await snapshot()).orders.map((o:any)=>o.status)),new Set(['ready_for_pickup','out_for_delivery']));
 now+=60000;await tick();const done=await snapshot();assert.ok(done.orders.every((o:any)=>o.status==='completed'));assert.equal(done.messages.length,16);
 assert.equal(new Set(done.messages.map((m:any)=>m.id)).size,16);assert.equal((await tick()).rows[0].value,0);
 const stored=(await db.query<{status:string;order_data:any}>('select status,order_data from demo_orders where public_demo')).rows;assert.ok(stored.every(o=>o.status===o.order_data.status&&o.order_data.updatedAt));
 now+=86400000;assert.equal((await snapshot()).orders.length,0);assert.equal((await snapshot()).messages.length,0);
 await db.query('select cleanup_public_demo($1)',[new Date(now).toISOString()]);assert.equal((await db.query('select * from demo_orders where public_demo')).rows.length,0);assert.equal((await db.query('select * from demo_kitchen_events')).rows.length,0);
 await db.exec('set role anon');await assert.rejects(db.query('select advance_demo_kitchen()'),/permission denied/);await db.exec('reset role');
});
test('public HTTP access rejects all mutations/PII, uses fictional fixtures, and remains bounded and idempotent',async t=>{
 const origin=await startApi(t,{KITCHEN_MODE:'public-demo',KITCHEN_BOARD_TOKEN:'old-token'});
 const menu=await (await fetch(`${origin}/menu?locale=en-US`)).json() as any;assert.equal(menu.publicDemo,true);assert.match(menu.checkoutFixtures['demo-delivery'].address['en-US'],/not deliverable/);
 let r=await fetch(`${origin}/kitchen/orders`);assert.equal(r.status,200);assert.equal((await r.json() as any).mode,'public_demo');
 const payload={locale:'en-US',fulfillment:'pickup',fixtureId:'demo-pickup',idempotencyKey:randomUUID(),lines:[line]};
 r=await fetch(`${origin}/orders`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...payload,customer:{name:'PRIVATE_PERSON'}})});assert.equal(r.status,400);assert.doesNotMatch(await r.text(),/PRIVATE_PERSON/);
 r=await fetch(`${origin}/orders`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...payload,lines:[{...line,phone:'PRIVATE_PHONE'}]})});assert.equal(r.status,400);
 r=await fetch(`${origin}/orders`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});assert.equal(r.status,201);const created=await r.json() as any;
 r=await fetch(`${origin}/orders`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});assert.equal(r.status,200);assert.equal((await r.json() as any).orderCode,created.orderCode);
 for(const method of ['PATCH','POST','DELETE']){r=await fetch(`${origin}/kitchen/orders/${created.orderCode}/status`,{method,headers:{authorization:'Bearer old-token','content-type':'application/json'},body:JSON.stringify({status:'completed'})});assert.equal(r.status,403);}
 r=await fetch(`${origin}/kitchen/orders?status=unknown`);assert.equal(r.status,400);
 const board=await (await fetch(`${origin}/kitchen/orders`)).json() as any;assert.equal(board.orders.length,1);assert.doesNotMatch(JSON.stringify(board),/customer|phone|address|idempotency|payload|old-token|nextTransition|expiresAt/);
 const tracked=await (await fetch(`${origin}/orders/${created.orderCode}`)).json() as any;assert.equal(tracked.status,'received');assert.ok(tracked.updatedAt);
});

test('public Supabase API creates synthetic orders atomically and customer lookup sees internal staff updates',async t=>{
 const db=await sqlDatabase();t.after(()=>db.close());const url=await rpcFixture(t,db);
 const origin=await startApi(t,{KITCHEN_MODE:'public-demo',SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:'fixture-service-key'});
 const payload={locale:'pt-BR',fulfillment:'delivery',fixtureId:'demo-delivery',idempotencyKey:randomUUID(),lines:[line]};
 const response=await fetch(`${origin}/orders`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});assert.equal(response.status,201);const created=await response.json() as any;
 assert.equal((await (await fetch(`${origin}/orders/${created.orderCode}`)).json() as any).status,'received');
 await db.query("update demo_orders set next_transition_at=clock_timestamp()-interval '1 second' where order_code=$1",[created.orderCode]);
 await db.query('select advance_demo_kitchen()');
 const board=await (await fetch(`${origin}/kitchen/orders`)).json() as any;assert.equal(board.orders[0].status,'confirmed');assert.equal(board.messages.length,2);
 const tracked=await (await fetch(`${origin}/orders/${created.orderCode}`)).json() as any;assert.equal(tracked.status,'confirmed');assert.notEqual(tracked.updatedAt,created.updatedAt);
 await db.query("update demo_orders set expires_at=clock_timestamp()-interval '1 second' where order_code=$1",[created.orderCode]);
 assert.equal((await fetch(`${origin}/orders/${created.orderCode}`)).status,404);
 assert.equal((await (await fetch(`${origin}/kitchen/orders`)).json() as any).orders.length,0);
});

test('all supported quote options keep API totals canonical and reject client supplied price/contact fields',async t=>{
 const origin=await startApi(t,{KITCHEN_MODE:'public-demo'});
 for(const flavorId of ['mussarela','calabresa','portuguesa','frango_catupiry','quatro_queijos'])for(const sizeId of ['broto','media','grande'] as const)for(const crustId of ['traditional','thin','stuffed'] as const){
  const candidate:CartLine={flavorId,sizeId,crustId,removedIngredientIds:[],extraToppingIds:['bacon'],quantity:2};
  const r=await fetch(`${origin}/quotes`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({lines:[candidate],fulfillment:'delivery'})});assert.equal(r.status,200);
  assert.deepEqual(await r.json(),calculate([candidate],'delivery'));
 }
 const bad=await fetch(`${origin}/quotes`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({lines:[{...line,unitPrice:1,customer:'PRIVATE'}],fulfillment:'pickup'})});assert.equal(bad.status,400);
});
