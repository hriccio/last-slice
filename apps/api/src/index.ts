import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {calculate,extras,flavors,isLocale,locales,sizes,crustSurcharge,deliveryFee,type OrderRequest,type Status} from '@last-slice/contracts';
const port=Number(process.env.PORT||3001);
const supabaseUrl=process.env.SUPABASE_URL, supabaseKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
const db=supabaseUrl&&supabaseKey?createClient(supabaseUrl,supabaseKey):null;
const memoryOrders=new Map<string,any>(), idempotency=new Map<string,{payload:string;order:any}>();
const send=(res:any,status:number,data:any)=>{res.writeHead(status,{'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'content-type,idempotency-key','access-control-allow-methods':'GET,POST,OPTIONS'});res.end(JSON.stringify(data));};
const safeError=(code:string,status=400,fieldErrors?:Record<string,string>)=>({status,body:{error:{code,messageKey:`errors.${code}`,...(fieldErrors?{fieldErrors}:{})}}});
async function body(req:any){let raw='';for await(const chunk of req)raw+=chunk;return JSON.parse(raw||'{}')}
function validPhone(phone:string){return /^\d{10,11}$/.test(phone.replace(/\D/g,''))}
function statusKey(status:Status){return `status.${status}`}
const server=createServer(async(req,res)=>{
 if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':'*','access-control-allow-headers':'content-type,idempotency-key','access-control-allow-methods':'GET,POST,OPTIONS'});return res.end();}
 const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
 if(req.method==='GET'&&url.pathname==='/health')return send(res,200,{ok:true});
 if(req.method==='GET'&&url.pathname==='/menu'){
  const locale=url.searchParams.get('locale');if(!isLocale(locale))return send(res,400,{error:{code:'unsupported_locale',messageKey:'errors.unsupported_locale'}});
  let menuRows:any[]=[];
  if(db){const result=await db.from('demo_menu').select('id,display_name,descriptions,ingredients,prices_brl_cents,available').eq('available',true);if(result.error)return send(res,500,safeError('menu_unavailable',500).body);menuRows=result.data||[];}
  const availableIds=new Set(menuRows.map(row=>row.id));
  const menuFlavors=flavors.filter(f=>!db||availableIds.has(f.id)).map(f=>{const row=menuRows.find(item=>item.id===f.id);return {id:f.id,name:row?.display_name??f.name,description:row?.descriptions?.[locale]??f.descriptions[locale],ingredients:f.ingredients.filter(([id])=>!row||row.ingredients.includes(id)).map(([id,pt,en])=>({id,name:locale==='pt-BR'?pt:en})),prices:row?.prices_brl_cents??f.prices};});
  return send(res,200,{locale,flavors:menuFlavors,sizes,crusts:[{id:'traditional',surcharge:0},{id:'thin',surcharge:0},{id:'stuffed',surcharge:crustSurcharge}],extras:extras.map(e=>({id:e.id,name:e.label[locale],price:500})),deliveryFee});
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
 const match=url.pathname.match(/^\/orders\/([A-Z0-9-]+)$/);if(req.method==='GET'&&match){let order=memoryOrders.get(match[1]);if(!order&&db){const {data}=await db.from('demo_orders').select('order_data').eq('order_code',match[1]).maybeSingle();order=data?.order_data;}if(!order)return send(res,404,safeError('order_not_found',404).body);return send(res,200,{orderCode:order.orderCode,createdAt:order.createdAt,status:order.status,statusKey:statusKey(order.status),fulfillment:order.fulfillment,lines:order.lines,subtotal:order.subtotal,deliveryFee:order.deliveryFee,total:order.total,demoOnly:true});}
 return send(res,404,{error:{code:'not_found',messageKey:'errors.not_found'}});
});
server.listen(port,()=>console.log(`Last Slice API listening on http://localhost:${port}${db?' (Supabase)':' (memory demo)'}`));
