import {ProposalStore,cartSnapshot,cartLine} from './assistant-proposals.js';
import {createServer} from 'node:http';
import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {prepareAssistant,assertAssistantConfigured} from './assistant-provider.js';
import {MemoryKitchen,nextOrderStatus} from './kitchen-simulation.js';
import {AssistantQueue,SupabaseLedger,MemoryLedger,conversationCapability} from './assistant-queue.js';
import {createClient} from '@supabase/supabase-js';
import {calculate,extras,flavors,isLocale,locales,sizes,crustSurcharge,deliveryFee,demoCheckoutFixtures,type OrderRequest,type OrderTrackingResponse,type Status} from '@last-slice/contracts';
const port=Number(process.env.PORT||3001);
const supabaseUrl=process.env.SUPABASE_URL, supabaseKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
const db=supabaseUrl&&supabaseKey?createClient(supabaseUrl,supabaseKey):null;
const assistantProvider=process.env.ASSISTANT_PROVIDER||(process.env.NODE_ENV==='production'?'unconfigured':'fake');
const queuedFake=assistantProvider==='queued-fake'&&process.env.NODE_ENV!=='production';
const previewProvider=queuedFake?async(messages:any[])=>({reply:messages[0]?.content.includes('pt-BR')?'Prévia de desenvolvimento: confira sua pizza nos controles do pedido.':'Development preview: review your pizza in the ordering controls.',mode:'development_fake' as const,input:0,output:0}):undefined;
const assistantQueue=db?new AssistantQueue(new SupabaseLedger(db),previewProvider):queuedFake?new AssistantQueue(new MemoryLedger(),previewProvider):null;
const kitchenMode=process.env.KITCHEN_MODE||(process.env.NODE_ENV==='production'?'public-demo':'manual');
if(!['manual','public-demo'].includes(kitchenMode))throw new Error('Invalid KITCHEN_MODE');
const publicDemo=kitchenMode==='public-demo';
const guardrails=process.env.PUBLIC_DEMO_GUARDRAILS==='true';
const allowedOrigins=new Set((process.env.ALLOWED_ORIGINS||'http://localhost:5173,http://localhost:4173').split(',').map(value=>value.trim()).filter(Boolean));
if(guardrails&&(!process.env.TURNSTILE_SECRET_KEY||!process.env.ALLOWED_ORIGINS))throw new Error('Public demo guardrails require TURNSTILE_SECRET_KEY and ALLOWED_ORIGINS');
if(process.env.NODE_ENV==='production'&&(!publicDemo||!db))throw new Error('Production requires public-demo mode and Supabase');
const memoryOrders=new Map<string,any>(), idempotency=new Map<string,{payload:string;order:any}>();
const kitchenSimulation=new MemoryKitchen(memoryOrders);
let simulationBusy=false;
async function kitchenTick(){if(simulationBusy)return;simulationBusy=true;try{if(db){const {error}=await db.rpc('advance_demo_kitchen');if(error)throw error;}else kitchenSimulation.tick();}catch{}finally{simulationBusy=false;}}
async function cleanup(){try{if(db)await db.rpc('cleanup_public_demo');else kitchenSimulation.cleanup();for(const [key,value]of idempotency)if(value.order.publicDemo&&value.order.expiresAt<=Date.now())idempotency.delete(key);}catch{}}
if(publicDemo){const tick=setInterval(()=>void kitchenTick(),5000);tick.unref();const sweep=setInterval(()=>void cleanup(),60000);sweep.unref();void cleanup();}
const corsHeaders={'access-control-allow-headers':'content-type,idempotency-key,authorization','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS','vary':'Origin'};
const send=(res:any,status:number,data:any)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store',...corsHeaders});res.end(JSON.stringify(data));};
const safeError=(code:string,status=400,fieldErrors?:Record<string,string>)=>({status,body:{error:{code,messageKey:`errors.${code}`,...(fieldErrors?{fieldErrors}:{})}}});
const clientLimits=new Map<string,{start:number;count:number}>();
function clientKey(req:any){const forwarded=req.headers['cf-connecting-ip']||req.socket.remoteAddress||'unknown';return String(forwarded).split(',')[0].trim().slice(0,128);}
function pruneClientLimits(now=Date.now()){for(const [key,value]of clientLimits)if(now-value.start>=60000)clientLimits.delete(key);while(clientLimits.size>10000)clientLimits.delete(clientLimits.keys().next().value!);}
const limitSweep=setInterval(()=>pruneClientLimits(),60000);limitSweep.unref();
function rateLimit(req:any,res:any,bucket:string,max:number,windowMs=60000){const now=Date.now(),key=`${bucket}:${clientKey(req)}`;let item=clientLimits.get(key);if(!item||now-item.start>=windowMs){item={start:now,count:0};clientLimits.set(key,item);}item.count++;if(clientLimits.size>10000)pruneClientLimits(now);
 if(item.count>max){const retry=Math.max(1,Math.ceil((item.start+windowMs-now)/1000));res.setHeader('retry-after',String(retry));send(res,429,{...safeError('demo_capacity_reached',429).body,retryAfterSeconds:retry});return false;}return true;}
async function verifyTurnstile(token:unknown,ip:string){if(!guardrails)return true;if(typeof token!=='string'||token.length<10||token.length>4096)return false;try{const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret:process.env.TURNSTILE_SECRET_KEY!,response:token,remoteip:ip})});const result=await response.json() as {success?:boolean;hostname?:string};const permittedHosts=new Set([...allowedOrigins].map(value=>new URL(value).hostname));return response.ok&&result.success===true&&typeof result.hostname==='string'&&permittedHosts.has(result.hostname);}catch{return false;}}
async function requireChallenge(req:any,res:any,input:any){if(!guardrails||!req.headers.origin)return true;const token=input?.turnstileToken;delete input.turnstileToken;if(!await verifyTurnstile(token,clientKey(req))){send(res,403,safeError('challenge_failed',403).body);return false;}return true;}
async function body(req:any){return boundedBody(req,24000)}
const assistantMaxBytes=24_000, assistantMaxMessage=1_200, assistantMaxHistory=10, assistantTimeoutMs=8_000;
async function boundedBody(req:any,maxBytes:number){let raw='';let bytes=0;for await(const chunk of req){bytes+=Buffer.byteLength(chunk);if(bytes>maxBytes)throw new Error('body_too_large');raw+=chunk;}return JSON.parse(raw||'{}')}
function fakeAssistantReply(locale:string,question:string,context:any){
 const ingredients=context.menu.map((flavor:any)=>`${flavor.name}: ${flavor.ingredients.join(', ')}`).join('; ');
 const selected=context.selection?.flavorName;
 if(locale==='en-US')return `Development preview (no AI provider is connected). I can explain the listed menu and supported choices. ${selected?`You are customizing ${selected}. `:''}Menu ingredients: ${ingredients}. Use the ordering controls to change selections and review the API quote.`;
 return `Prévia de desenvolvimento (nenhum provedor de IA está conectado). Posso explicar o cardápio e as opções disponíveis. ${selected?`Você está montando ${selected}. `:''}Ingredientes do cardápio: ${ingredients}. Use os controles do pedido para alterar escolhas e conferir o orçamento da API.`;
}
async function assistantMenu(locale:'pt-BR'|'en-US'){
 let rows:any[]=[];
 if(db){const result=await db.from('demo_menu').select('id,display_name,descriptions,ingredients,available').eq('available',true);if(result.error)throw new Error('assistant_unavailable');rows=result.data||[];}
 const availableIds=new Set(rows.map(row=>row.id));
 return flavors.filter(flavor=>!db||availableIds.has(flavor.id)).map(flavor=>{
  const row=rows.find(item=>item.id===flavor.id);
  const ingredients=flavor.ingredients.filter(([id])=>!row||row.ingredients.includes(id)).map(item=>item[locale==='pt-BR'?1:2]);
  return {name:row?.display_name??flavor.name,description:row?.descriptions?.[locale]??flavor.descriptions[locale],ingredients,sizes:sizes.map(size=>size.label[locale])};
 });
}
const proposals=new ProposalStore();
async function proposalMenu(){
 let rows:any[]=flavors.map(f=>({id:f.id,ingredients:f.ingredients.map(i=>i[0]),prices_brl_cents:f.prices,available:true}));
 if(db){const result=await db.from('demo_menu').select('id,display_name,descriptions,ingredients,prices_brl_cents,available');if(result.error)throw new Error('assistant_unavailable');rows=result.data||[];}
 return {signature:createHash('sha256').update(JSON.stringify(rows.sort((a,b)=>a.id.localeCompare(b.id)))).digest('hex'),availableIds:rows.filter(r=>r.available).map(r=>r.id),rows};
}
async function presentAssistant(ticket:any,cap:string){
 const {candidate,...safe}=ticket;
 if(ticket.state==='completed'&&candidate){try{const proposal=await proposals.present(ticket.requestId,cap,candidate,await proposalMenu());return {...safe,...(proposal?{proposal}:{})};}catch{return {...safe,proposalError:'proposal_invalid'};}}
 return safe;
}
function validPhone(phone:string){return /^\d{10,11}$/.test(phone.replace(/\D/g,''))}
function statusKey(status:Status){return `status.${status}`}
const orderStatuses:Status[]=['received','confirmed','preparing','ready_for_pickup','out_for_delivery','completed','cancelled'];
const activeOrderStatuses:Status[]=['received','confirmed','preparing','ready_for_pickup','out_for_delivery'];
function orderLines(data:any){
 return Array.isArray(data?.lines)?data.lines.map((line:any)=>({flavorId:line.flavorId,sizeId:line.sizeId,crustId:line.crustId,removedIngredientIds:line.removedIngredientIds,extraToppingIds:line.extraToppingIds,quantity:line.quantity,unitPrice:line.unitPrice,lineTotal:line.lineTotal})):[];
}
function kitchenOrder(order:any,orderCode?:string,createdAt?:string,status?:Status){
 const data=order?.order_data??order;
 const lines=orderLines(data);
 return {orderCode:orderCode??data?.orderCode,createdAt:createdAt??data?.createdAt,locale:data?.locale,fulfillment:data?.fulfillment,status:status??order?.status??data?.status,lines,subtotal:data?.subtotal,deliveryFee:data?.deliveryFee,total:data?.total};
}
function publicLines(value:any){
 const allowed=['flavorId','sizeId','crustId','removedIngredientIds','extraToppingIds','quantity'];
 if(!Array.isArray(value)||value.length<1||value.length>10||value.some(line=>!line||typeof line!=='object'||Array.isArray(line)||Object.keys(line).some(k=>!allowed.includes(k))||!Array.isArray(line.removedIngredientIds)||!Array.isArray(line.extraToppingIds)))throw new Error('validation_error');
 return value;
}
function orderSnapshot(order:any):OrderTrackingResponse{
 return {orderCode:order.orderCode,createdAt:new Date(order.createdAt).toISOString(),updatedAt:new Date(order.updatedAt??order.createdAt).toISOString(),status:order.status,statusKey:statusKey(order.status),fulfillment:order.fulfillment,lines:orderLines(order),subtotal:order.subtotal,deliveryFee:order.deliveryFee,total:order.total,demoOnly:true};
}
let publicReadStart=Date.now(),publicReads=0;
async function publicSnapshot(status:string|null,fulfillment:string|null){
 if(db){const {data,error}=await db.rpc('public_kitchen_snapshot',{p_status:status,p_fulfillment:fulfillment});if(error||!data)throw new Error('kitchen_unavailable');return {...data,orders:data.orders.map((order:any)=>kitchenOrder(order))};}
 const snapshot=kitchenSimulation.snapshot(status||undefined,fulfillment||undefined);return {...snapshot,orders:snapshot.orders.map(order=>kitchenOrder(order))};
}
function kitchenAuthorized(req:any){
 const expected=process.env.KITCHEN_BOARD_TOKEN;
 if(!expected)return 'unavailable';
 const authorization=typeof req.headers.authorization==='string'?req.headers.authorization:'';
 const match=authorization.match(/^Bearer\s+(.+)$/i);
 const supplied=match?.[1]??'';
 const expectedDigest=createHash('sha256').update(expected).digest(),suppliedDigest=createHash('sha256').update(supplied).digest();
 return timingSafeEqual(expectedDigest,suppliedDigest)?'ok':'unauthorized';
}
function assistantError(res:any,error:unknown){
 const code=error instanceof Error?error.message:'assistant_unavailable';
 const allowed=['assistant_queue_full','assistant_budget_exhausted','assistant_request_expired','assistant_already_pending','assistant_input_too_large','assistant_timeout','validation_error'];
 const safe=allowed.includes(code)?code:'assistant_unavailable';
 const status=safe==='validation_error'||safe==='assistant_input_too_large'?400:safe==='assistant_request_expired'?410:['assistant_queue_full','assistant_budget_exhausted','assistant_already_pending'].includes(safe)?429:503;
 return send(res,status,{...safeError(safe,status).body,...((error as any)?.resetsAt?{resetsAt:(error as any).resetsAt}:{}),...(status===429?{retryAfterSeconds:safe==='assistant_budget_exhausted'?86400:45}:{})});
}
let controlWindow=Date.now(),controlCalls=0;
const server=createServer(async(req,res)=>{
 try{
 const origin=typeof req.headers.origin==='string'?req.headers.origin:'';
 if(origin&&!allowedOrigins.has(origin))return send(res,403,safeError('origin_not_allowed',403).body);
 if(origin)res.setHeader('access-control-allow-origin',origin);
 if(req.method==='OPTIONS'){res.writeHead(204,{...corsHeaders,...(origin?{'access-control-allow-origin':origin}:{})});return res.end();}
 const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
 if(publicDemo&&(['/orders','/quotes','/menu'].includes(url.pathname)||url.pathname.startsWith('/orders/')||url.pathname.startsWith('/kitchen/'))&&!rateLimit(req,res,'public-read',120))return;
 if(url.pathname==='/orders'&&req.method==='POST'&&!rateLimit(req,res,'order-submit',10))return;
 if(url.pathname==='/assistant/messages'&&req.method==='POST'&&!rateLimit(req,res,'assistant-submit',8))return;
 if(url.pathname.startsWith('/assistant/')&&!rateLimit(req,res,'assistant-api',60))return;
 if(req.method==='GET'&&url.pathname==='/health')return send(res,200,{ok:true});
 if(req.method==='GET'&&url.pathname==='/config')return send(res,200,{publicDemo,mode:kitchenMode,persistence:db?'supabase':'memory',demoOnly:true});
 if(publicDemo&&(['/orders','/quotes','/menu'].includes(url.pathname)||url.pathname.startsWith('/orders/'))){
  if(Date.now()-publicReadStart>=60000){publicReadStart=Date.now();publicReads=0;}
  if(++publicReads>600)return send(res,429,{...safeError('demo_capacity_reached',429).body,retryAfterSeconds:60});
 }
 if(url.pathname.startsWith('/kitchen/')&&publicDemo){
  if(req.method!=='GET')return send(res,403,safeError('kitchen_read_only',403).body);
  if(Date.now()-publicReadStart>=60000){publicReadStart=Date.now();publicReads=0;}
  if(++publicReads>600)return send(res,429,{...safeError('demo_capacity_reached',429).body,retryAfterSeconds:60});
  const status=url.searchParams.get('status'),fulfillment=url.searchParams.get('fulfillment');
  if(status&&!orderStatuses.includes(status as Status)||fulfillment&&!['pickup','delivery'].includes(fulfillment))return send(res,400,safeError('validation_error').body);
  try{
   const snapshot=await publicSnapshot(status,fulfillment);
   if(url.pathname==='/kitchen/orders')return send(res,200,snapshot);
   if(url.pathname==='/kitchen/messages')return send(res,200,{messages:snapshot.messages,mode:'public_demo',simulation:true});
   return send(res,404,safeError('not_found',404).body);
  }catch{return send(res,503,safeError('kitchen_unavailable',503).body);}
 }
 if(url.pathname.startsWith('/kitchen/')){
  const access=kitchenAuthorized(req);
  if(access==='unavailable')return send(res,503,safeError('kitchen_unavailable',503).body);
  if(access!=='ok')return send(res,401,safeError('kitchen_unauthorized',401).body);
 }
 if(req.method==='GET'&&url.pathname==='/kitchen/orders'){
  const filter=url.searchParams.get('status');
  if(filter&&!orderStatuses.includes(filter as Status))return send(res,400,safeError('validation_error',400,{status:'validation.status'}).body);
  let rows:any[]=[];
  if(db){
   let query=db.from('demo_orders').select('order_code,created_at,status,order_data').order('created_at',{ascending:false}).limit(100);
   if(filter)query=query.eq('status',filter);
   const result=await query;if(result.error)return send(res,500,safeError('kitchen_unavailable',500).body);rows=result.data||[];
  }else{
   rows=[...memoryOrders.values()].map(order=>({order_code:order.orderCode,created_at:order.createdAt,status:order.status,order_data:order}));
   if(filter)rows=rows.filter(row=>row.status===filter);
  }
  const orders=rows.map(row=>kitchenOrder(row.order_data,row.order_code,row.created_at,row.status));
  orders.sort((a,b)=>Number(activeOrderStatuses.includes(b.status))-Number(activeOrderStatuses.includes(a.status))||Date.parse(b.createdAt)-Date.parse(a.createdAt));
  return send(res,200,{orders,persistence:db?'supabase':'memory'});
 }
 const kitchenStatusMatch=url.pathname.match(/^\/kitchen\/orders\/([A-Z0-9-]+)\/status$/);
 if(req.method==='PATCH'&&kitchenStatusMatch){
  let input:any;try{input=await boundedBody(req,2_048)}catch{return send(res,400,safeError('validation_error').body)}
  if(!input||typeof input!=='object'||Array.isArray(input))return send(res,400,safeError('validation_error').body);
  const code=kitchenStatusMatch[1];let order:any,createdAt:string|undefined,currentStatus:Status|undefined;
  if(db){
   const result=await db.from('demo_orders').select('order_code,created_at,status,order_data').eq('order_code',code).maybeSingle();
   if(result.error)return send(res,500,safeError('kitchen_unavailable',500).body);
   if(!result.data)return send(res,404,safeError('order_not_found',404).body);
   order=result.data.order_data;createdAt=result.data.created_at;currentStatus=result.data.status as Status;
  }else{
   order=memoryOrders.get(code);if(!order)return send(res,404,safeError('order_not_found',404).body);currentStatus=order.status;
  }
  if(!orderStatuses.includes(input.expectedStatus)||!orderStatuses.includes(input.status))return send(res,400,safeError('invalid_status_transition',400).body);
  if(input.expectedStatus!==currentStatus)return send(res,409,safeError('order_status_conflict',409).body);
  if(nextOrderStatus(currentStatus!,order.fulfillment)!==input.status)return send(res,400,safeError('invalid_status_transition',400).body);
  const timestamp=new Date().toISOString();
  if(db){
   const update=await db.from('demo_orders').update({status:input.status,updated_at:timestamp,order_data:{...order,status:input.status,statusKey:statusKey(input.status),updatedAt:timestamp}}).eq('order_code',code).eq('status',currentStatus).select('order_code,created_at,status,order_data').maybeSingle();
   if(update.error)return send(res,500,safeError('kitchen_unavailable',500).body);
   if(!update.data)return send(res,409,safeError('order_status_conflict',409).body);
   order=update.data.order_data;createdAt=update.data.created_at;currentStatus=update.data.status as Status;
  }
  const cached=memoryOrders.get(code);if(cached){cached.status=input.status;cached.statusKey=statusKey(input.status);cached.updatedAt=timestamp;}
  if(!db){order.status=input.status;order.statusKey=statusKey(input.status);order.updatedAt=timestamp;}
  return send(res,200,{order:kitchenOrder(order,code,createdAt,currentStatus)});
 }
 if(url.pathname.startsWith('/assistant/')){
  if(Date.now()-controlWindow>=60000){controlWindow=Date.now();controlCalls=0;}
  if(++controlCalls>600)return send(res,429,{...safeError('assistant_queue_full',429).body,retryAfterSeconds:60});
 }
 const proposalMatch=url.pathname.match(/^\/assistant\/proposals\/([a-f0-9-]{36})(\/confirm)?$/i);
 if(proposalMatch&&['POST','DELETE'].includes(req.method||'')){
  try{
   const cap=conversationCapability(req.headers.authorization);
   if(req.method==='DELETE'&&!proposalMatch[2]){proposals.discard(proposalMatch[1],cap);return send(res,200,{dismissed:true});}
   if(req.method!=='POST'||!proposalMatch[2])return send(res,404,safeError('not_found',404).body);
   const input=await body(req);if(req.method==='POST'&&!await requireChallenge(req,res,input))return;if(!input||Object.keys(input).some(k=>k!=='cartSnapshot'))throw new Error('proposal_invalid');
   const proposal=proposals.confirm(proposalMatch[1],cap,cartSnapshot(input.cartSnapshot),await proposalMenu());
   return send(res,200,{proposal});
  }catch(e){const code=e instanceof Error&&['proposal_expired','proposal_stale','proposal_invalid'].includes(e.message)?e.message:'proposal_invalid';return send(res,code==='proposal_expired'?410:code==='proposal_stale'?409:400,safeError(code).body);}
 }
 const ticketMatch=url.pathname.match(/^\/assistant\/requests\/([a-f0-9-]{36})$/i);
 if(ticketMatch&&['GET','DELETE'].includes(req.method||'')){
  try{
   if(!assistantQueue)throw new Error('assistant_unavailable');
   const cap=conversationCapability(req.headers.authorization);
   const ticket=await assistantQueue.status(ticketMatch[1],cap,req.method==='DELETE');
   return send(res,200,await presentAssistant(ticket,cap));
  }catch(e){return assistantError(res,e);}
 }
 if(req.method==='POST'&&url.pathname==='/assistant/messages'){
  let input:any;try{input=await boundedBody(req,assistantMaxBytes)}catch(error){return send(res,400,safeError(error instanceof Error&&error.message==='body_too_large'?'assistant_request_too_large':'validation_error').body)}
  if(!await requireChallenge(req,res,input))return;
  if(!input||typeof input!=='object'||Array.isArray(input))return send(res,400,safeError('validation_error').body);
  const fields:Record<string,string>={};
  if(!isLocale(input.locale))fields.locale='validation.locale';
  const assistantLocale:'pt-BR'|'en-US'=isLocale(input.locale)?input.locale:'pt-BR';
  if(typeof input.message!=='string'||!input.message.trim()||Buffer.byteLength(input.message)>assistantMaxMessage)fields.message='validation.assistant_message';
  if(!Array.isArray(input.history)||input.history.length>assistantMaxHistory||input.history.some((item:any)=>!item||!['user','assistant'].includes(item.role)||typeof item.content!=='string'||!item.content.trim()||Buffer.byteLength(item.content)>4000))fields.history='validation.assistant_history';
  const screen=input.context?.screen;
  if(!['menu','customization','cart','checkout'].includes(screen))fields['context.screen']='validation.assistant_context';
  let currentMenu:any[];try{currentMenu=await assistantMenu(assistantLocale)}catch{return send(res,503,safeError('assistant_unavailable',503).body)}
  const context:any={screen,menu:currentMenu,options:{crusts:['traditional','thin','stuffed'],extras:extras.map(e=>e.label[assistantLocale]),deliveryFeeBrlCents:deliveryFee}};
  const selection=input.context?.selection;
  if(selection!==undefined&&selection!==null){
   const flavor=flavors.find(f=>f.id===selection.flavorId);
   if(!flavor||!sizes.some(s=>s.id===selection.sizeId)||!['traditional','thin','stuffed'].includes(selection.crustId)||!Array.isArray(selection.removedIngredientIds)||!Array.isArray(selection.extraToppingIds))fields['context.selection']='validation.assistant_context';
   else try{
    const selectedLine={flavorId:selection.flavorId,sizeId:selection.sizeId,crustId:selection.crustId,removedIngredientIds:selection.removedIngredientIds,extraToppingIds:selection.extraToppingIds,quantity:1};
    const fulfillment=input.context?.fulfillment||'pickup';if(!['pickup','delivery'].includes(fulfillment))throw new Error('invalid_fulfillment');
    const quote=calculate([selectedLine],fulfillment);
    context.selection={flavorName:flavor.name,size:sizes.find(s=>s.id===selection.sizeId)?.label[assistantLocale],crustId:selection.crustId,ingredients:flavor.ingredients.filter(item=>!selection.removedIngredientIds.includes(item[0])).map(item=>item[assistantLocale==='pt-BR'?1:2]),extras:extras.filter(e=>selection.extraToppingIds.includes(e.id)).map(e=>e.label[assistantLocale])};
    context.quote={subtotalBrlCents:quote.subtotal,deliveryFeeBrlCents:quote.deliveryFee,totalBrlCents:quote.total};
   }catch{fields['context.selection']='validation.assistant_context';}
  }
  const cartLines=input.context?.cartLines;
  if(cartLines!==undefined){
   if(!Array.isArray(cartLines)||cartLines.length>10||!['pickup','delivery'].includes(input.context?.fulfillment))fields['context.cartLines']='validation.assistant_context';
   else if(cartLines.length){try{const quote=calculate(cartLines,input.context.fulfillment);context.quote={subtotalBrlCents:quote.subtotal,deliveryFeeBrlCents:quote.deliveryFee,totalBrlCents:quote.total,lines:quote.lines.map(line=>({flavor:flavors.find(f=>f.id===line.flavorId)?.name,size:sizes.find(s=>s.id===line.sizeId)?.label[assistantLocale],quantity:line.quantity,lineTotalBrlCents:line.lineTotal}))};}catch{fields['context.cartLines']='validation.assistant_context';}}
  }
  let snapshot:ReturnType<typeof cartSnapshot>|undefined;
  if(input.context?.cartSnapshot!==undefined){try{
   snapshot=cartSnapshot(input.context.cartSnapshot);
   const menu=await proposalMenu();if(snapshot.lines.some(l=>!menu.availableIds.includes(l.flavorId)))throw new Error();
   context.cartSnapshot=snapshot;
   const draft=input.context.draftProposal;
   if(draft){
    if(Object.keys(draft).some(k=>!['operation','targetLineId','line'].includes(k))||!['add','update','remove'].includes(draft.operation)||draft.operation==='add'&&draft.targetLineId!==null||draft.operation!=='add'&&!snapshot.lines.some(l=>l.lineId===draft.targetLineId))throw new Error();
    context.draftProposal={operation:draft.operation,targetLineId:draft.targetLineId,line:draft.operation==='remove'?null:cartLine(draft.line)};
   }
   context.proposalMenu={flavors:flavors.filter(f=>menu.availableIds.includes(f.id)).map(f=>({id:f.id,name:f.name,ingredients:f.ingredients.map(i=>({id:i[0],name:i[assistantLocale==='pt-BR'?1:2]}))})),sizes:sizes.map(s=>({id:s.id,name:s.label[assistantLocale]})),crusts:['traditional','thin','stuffed'],extras:extras.map(e=>({id:e.id,name:e.label[assistantLocale]}))};
  }catch{fields['context.cartSnapshot']='validation.assistant_context';}}
  if(Object.keys(fields).length)return send(res,400,safeError('validation_error',400,fields).body);
  try{
   if(assistantProvider==='fake'&&process.env.NODE_ENV!=='production')return send(res,200,{reply:fakeAssistantReply(assistantLocale,input.message,context),mode:'development_fake',disclaimer:true});
   if(!['openai','openai-compatible','queued-fake'].includes(assistantProvider)||!assistantQueue)throw new Error('assistant_unavailable');
   if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.requestId||''))throw new Error('validation_error');
   if(!queuedFake)assertAssistantConfigured();
   const cap=conversationCapability(req.headers.authorization);
   if(snapshot)proposals.register(input.requestId,cap,snapshot,assistantLocale);
   const messages=prepareAssistant(assistantLocale,input.history,input.message.trim(),context);
   const ticket=await assistantQueue.submit(input.requestId,cap,messages);
   return send(res,202,await presentAssistant(ticket,cap));
  }catch(e){return assistantError(res,e);}
 }
 if(req.method==='GET'&&url.pathname==='/menu'){
  const locale=url.searchParams.get('locale');if(!isLocale(locale))return send(res,400,{error:{code:'unsupported_locale',messageKey:'errors.unsupported_locale'}});
  let menuRows:any[]=[];
  if(db){const result=await db.from('demo_menu').select('id,display_name,descriptions,ingredients,prices_brl_cents,available').eq('available',true);if(result.error)return send(res,500,safeError('menu_unavailable',500).body);menuRows=result.data||[];}
  const availableIds=new Set(menuRows.map(row=>row.id));
  const menuFlavors=flavors.filter(f=>!db||availableIds.has(f.id)).map(f=>{const row=menuRows.find(item=>item.id===f.id);return {id:f.id,name:row?.display_name??f.name,description:row?.descriptions?.[locale]??f.descriptions[locale],ingredients:f.ingredients.filter(([id])=>!row||row.ingredients.includes(id)).map(([id,pt,en])=>({id,name:locale==='pt-BR'?pt:en})),prices:row?.prices_brl_cents??f.prices};});
  return send(res,200,{publicDemo,checkoutFixtures:publicDemo?demoCheckoutFixtures:undefined,locale,flavors:menuFlavors,sizes,crusts:[{id:'traditional',surcharge:0},{id:'thin',surcharge:0},{id:'stuffed',surcharge:crustSurcharge}],extras:extras.map(e=>({id:e.id,name:e.label[locale],price:500})),deliveryFee});
 }
 if(req.method==='POST'&&url.pathname==='/quotes'){
  let input:any;try{input=await body(req)}catch{return send(res,400,safeError('validation_error').body)}
  if(!input||typeof input!=='object'||Array.isArray(input))return send(res,400,safeError('validation_error').body);
  const fields:Record<string,string>={};
  if(!['pickup','delivery'].includes(input.fulfillment))fields.fulfillment='validation.fulfillment';
  if(publicDemo){try{publicLines(input.lines);if(Object.keys(input).some(k=>!['fulfillment','lines'].includes(k)))throw new Error();}catch{fields.lines='validation.invalid_order';}}
  let quote:any;try{quote=calculate(input.lines||[],input.fulfillment)}catch(e){fields.lines=`validation.${e instanceof Error?e.message:'invalid_order'}`}
  if(Object.keys(fields).length)return send(res,400,safeError('validation_error',400,fields).body);
  return send(res,200,quote);
 }
 if(req.method==='POST'&&url.pathname==='/orders'&&publicDemo){
  let input:any;try{input=await body(req);}catch{return send(res,400,safeError('validation_error').body);}
  if(!await requireChallenge(req,res,input))return;
  const allowed=['idempotencyKey','locale','fulfillment','fixtureId','lines'];
  try{
   if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!allowed.includes(k)))throw new Error();
   if(typeof input.idempotencyKey!=='string'||!/^(?:[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/i.test(input.idempotencyKey)||!isLocale(input.locale)||!['pickup','delivery'].includes(input.fulfillment)||input.fixtureId!==`demo-${input.fulfillment}`)throw new Error();
   publicLines(input.lines);
   const key=createHash('sha256').update(`public-demo:${input.idempotencyKey}`).digest('hex');
   const priced=calculate(input.lines,input.fulfillment);const payload=JSON.stringify({locale:input.locale,fulfillment:input.fulfillment,fixtureId:input.fixtureId,lines:priced.lines});
   const existing=idempotency.get(key);
   if(!db&&existing){
    if(!existing.order.publicDemo||existing.payload!==payload)return send(res,409,safeError('idempotency_conflict',409).body);
    if(existing.order.expiresAt<=Date.now())return send(res,404,safeError('order_not_found',404).body);
    return send(res,200,orderSnapshot(existing.order));
   }
   const now=new Date().toISOString();const order:any={orderCode:`LS-${randomBytes(7).toString('hex').toUpperCase()}`,createdAt:now,updatedAt:now,status:'received',statusKey:'status.received',locale:input.locale,fulfillment:input.fulfillment,...priced,demoOnly:true};
   if(db){
    const {data,error}=await db.rpc('create_public_demo_order',{p_code:order.orderCode,p_key:key,p_payload:payload,p_order:order});
    if(error)return send(res,503,safeError('order_persistence_failed',503).body);
    if(data.error)return send(res,data.error==='demo_capacity_reached'?429:data.error==='order_not_found'?404:409,{...safeError(data.error).body,...(data.error==='demo_capacity_reached'?{retryAfterSeconds:60}:{})});
    return send(res,data.reused?200:201,orderSnapshot(data.order));
   }
   const recent=[...memoryOrders.values()].filter(o=>o.publicDemo&&Date.parse(o.createdAt)>Date.now()-60000).length;
   if(recent>=20||[...memoryOrders.values()].filter(o=>o.publicDemo&&o.expiresAt>Date.now()).length>=2000)return send(res,429,{...safeError('demo_capacity_reached',429).body,retryAfterSeconds:60});
   kitchenSimulation.initialize(order);memoryOrders.set(order.orderCode,order);idempotency.set(key,{payload,order});return send(res,201,orderSnapshot(order));
  }catch{return send(res,400,safeError('validation_error').body);}
 }
 if(req.method==='POST'&&url.pathname==='/orders'){
  let input:OrderRequest;try{input=await body(req)}catch{return send(res,400,safeError('validation_error').body)}
  const fields:Record<string,string>={};
  const key=String(input.idempotencyKey||req.headers['idempotency-key']||'');
  if(key.length<8||key.length>128)fields.idempotencyKey='validation.idempotency_key';
  if(!isLocale(input.locale))fields.locale='validation.locale';
  if(!['pickup','delivery'].includes(input.fulfillment))fields.fulfillment='validation.fulfillment';
  if(!input.customer||typeof input.customer.name!=='string'||input.customer.name.trim().length<2||input.customer.name.trim().length>80)fields['customer.name']='validation.customer_name';
  if(!input.customer||typeof input.customer.phone!=='string'||!validPhone(input.customer.phone))fields['customer.phone']='validation.phone';
  if(input.fulfillment==='delivery'){
    const a=input.address;for(const field of ['street','number','neighborhood','city','state'] as const)if(!a||typeof a[field]!=='string'||!a[field].trim())fields[`address.${field}`]=`validation.address_${field}`;
    if(a?.state&&!/^[A-Za-z]{2}$/.test(a.state))fields['address.state']='validation.state';
  }
  let priced:any;try{priced=calculate(input.lines||[],input.fulfillment)}catch(e){fields.lines=`validation.${e instanceof Error?e.message:'invalid_order'}`;}
  if(Object.keys(fields).length)return send(res,400,safeError('validation_error',400,fields).body);
  const payload=JSON.stringify({...input,idempotencyKey:key});const existing=idempotency.get(key);
  if(existing){if(existing.payload!==payload)return send(res,409,safeError('idempotency_conflict',409).body);return send(res,200,existing.order);}
  const code=`LS-${randomBytes(7).toString('hex').toUpperCase()}`;
  const order={orderCode:code,createdAt:new Date().toISOString(),status:'received',statusKey:statusKey('received'),locale:input.locale,fulfillment:input.fulfillment,lines:priced.lines,subtotal:priced.subtotal,deliveryFee:priced.deliveryFee,total:priced.total,demoOnly:true};
  if(db){const {error}=await db.from('demo_orders').insert({order_code:code,idempotency_key:key,payload,order_data:order});if(error){if(error.code==='23505'){const {data}=await db.from('demo_orders').select('payload,order_data').eq('idempotency_key',key).single();if(data){if(data.payload!==payload)return send(res,409,safeError('idempotency_conflict',409).body);return send(res,200,data.order_data);}}return send(res,500,safeError('order_persistence_failed',500).body);}}
  memoryOrders.set(code,order);idempotency.set(key,{payload,order});return send(res,201,order);
 }
 const match=url.pathname.match(/^\/orders\/([A-Z0-9-]+)$/);
 if(req.method==='GET'&&match){
  let order:any;
  if(db){
   let lookup=db.from('demo_orders').select('order_data,status,created_at,updated_at').eq('order_code',match[1]);
   if(publicDemo)lookup=lookup.eq('public_demo',true).gt('expires_at',new Date().toISOString());
   const {data,error}=await lookup.maybeSingle();
   if(error)return send(res,500,safeError('order_lookup_failed',500).body);
   order=data?{...data.order_data,status:data.status,createdAt:data.created_at,updatedAt:data.updated_at}:undefined;
  }else order=memoryOrders.get(match[1]);
  if(!order||publicDemo&&(!db&&(!order.publicDemo||order.expiresAt<=Date.now())))return send(res,404,safeError('order_not_found',404).body);
  const response=orderSnapshot(order);
  return send(res,200,response);
 }
 return send(res,404,{error:{code:'not_found',messageKey:'errors.not_found'}});
 }catch{return send(res,500,safeError('request_failed',500).body);}
});
server.listen(port,()=>console.log(`Last Slice API listening on http://localhost:${port}${db?' (Supabase)':' (memory demo)'}`));
