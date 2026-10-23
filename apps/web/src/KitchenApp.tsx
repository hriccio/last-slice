import React,{useMemo,useState}from'react';
import{ArrowRight,Check,LogOut,RefreshCw,Shield,Utensils}from'lucide-react';
import{extras,flavors,sizes,type Locale,type Status}from'@last-slice/contracts';
import'./kitchen.css';

type KitchenLine={flavorId:string;sizeId:string;crustId:string;removedIngredientIds:string[];extraToppingIds:string[];quantity:number;unitPrice:number;lineTotal:number};
type KitchenOrder={orderCode:string;createdAt:string;locale:Locale;fulfillment:'pickup'|'delivery';status:Status;lines:KitchenLine[];subtotal:number;deliveryFee:number;total:number};
type BoardFilter='active'|'all'|Status;
const api=import.meta.env.VITE_API_URL||'http://localhost:3001';
const activeStatuses:Status[]=['received','confirmed','preparing','ready_for_pickup','out_for_delivery'];
const steps:Status[]=['received','confirmed','preparing','ready_for_pickup','out_for_delivery','completed'];
const text={
 'pt-BR':{title:'Quadro da cozinha',brand:'THE LAST SLICE · DEMONSTRAÇÃO',language:'Idioma',token:'Token da cozinha',tokenHint:'Informe o token configurado no servidor',connect:'Acessar quadro',connecting:'Conectando…',refresh:'Atualizar pedidos',leave:'Sair',filter:'Filtrar pedidos',active:'Em andamento',all:'Todos',completed:'Concluídos',received:'Recebido',confirmed:'Confirmado',preparing:'Em preparo',ready_for_pickup:'Pronto para retirada',out_for_delivery:'Saiu para entrega',cancelled:'Cancelado',pickup:'Retirada',delivery:'Entrega',empty:'Nenhum pedido neste filtro.',items:'Itens',total:'Total',next:'Avançar para',confirm:'Confirmação',confirmText:'Atualizar o status demonstrativo do pedido',updated:(code:string,status:string)=>`Pedido ${code} atualizado para ${status}.`,error:'Não foi possível carregar ou atualizar. Tente novamente.',unauthorized:'Token inválido. Confira o token e tente novamente.',unavailable:'O acesso ao quadro não está configurado no servidor.',conflict:'O pedido mudou desde a última atualização. O quadro foi atualizado.',memory:'Modo local temporário: os pedidos desaparecem quando a API reiniciar.',supabase:'Pedidos demonstrativos salvos no Supabase.',demo:'Somente demonstração. Nenhum pedido real será preparado ou entregue.',order:'Pedido',languagePt:'Português',languageEn:'English',loading:'Carregando pedidos…',status:'Status',quantity:'un.',without:'Sem',extras:'Adicionais',traditional:'Massa tradicional',thin:'Massa fina',stuffed:'Massa recheada com Catupiry',time:(value:string)=>`Recebido ${value}`},
 'en-US':{title:'Kitchen board',brand:'THE LAST SLICE · DEMO',language:'Language',token:'Kitchen token',tokenHint:'Enter the token configured on the server',connect:'Open board',connecting:'Connecting…',refresh:'Refresh orders',leave:'Sign out',filter:'Filter orders',active:'Active',all:'All',completed:'Completed',received:'Received',confirmed:'Confirmed',preparing:'Preparing',ready_for_pickup:'Ready for pickup',out_for_delivery:'Out for delivery',cancelled:'Cancelled',pickup:'Pickup',delivery:'Delivery',empty:'No orders match this filter.',items:'Items',total:'Total',next:'Advance to',confirm:'Confirm change',confirmText:'Update this demo order status',updated:(code:string,status:string)=>`Order ${code} advanced to ${status}.`,error:'Could not load or update orders. Try again.',unauthorized:'That token is invalid. Check it and try again.',unavailable:'Kitchen board access is not configured on the server.',conflict:'This order changed since the last refresh. The board has been updated.',memory:'Temporary local mode: orders disappear when the API restarts.',supabase:'Demo orders are stored in Supabase.',demo:'Demo only. No real order will be prepared or delivered.',order:'Order',languagePt:'Português',languageEn:'English',loading:'Loading orders…',status:'Status',quantity:'qty',without:'Without',extras:'Extras',traditional:'Traditional crust',thin:'Thin crust',stuffed:'Catupiry-stuffed crust',time:(value:string)=>`Received ${value}`}
};
function money(cents:number,locale:Locale){return new Intl.NumberFormat(locale,{style:'currency',currency:'BRL'}).format(cents/100)}
function statusName(locale:Locale,status:Status){return text[locale][status]}
function nextStatus(order:KitchenOrder):Status|null{if(order.status==='received')return'confirmed';if(order.status==='confirmed')return'preparing';if(order.status==='preparing')return order.fulfillment==='pickup'?'ready_for_pickup':'out_for_delivery';if(order.status==='ready_for_pickup'||order.status==='out_for_delivery')return'completed';return null}
function lineDescription(line:KitchenLine,locale:Locale){
 const flavor=flavors.find(item=>item.id===line.flavorId);const size=sizes.find(item=>item.id===line.sizeId);
 const flavorNames:Record<string,string>={mussarela:locale==='pt-BR'?'Muçarela':'Mozzarella',calabresa:locale==='pt-BR'?'Calabresa':'Calabresa sausage',portuguesa:locale==='pt-BR'?'Portuguesa':'Brazilian style',frango_catupiry:locale==='pt-BR'?'Frango com Catupiry':'Chicken with Catupiry',quatro_queijos:locale==='pt-BR'?'Quatro Queijos':'Four cheese'};
 const removed=line.removedIngredientIds.flatMap(id=>{const ingredient=flavor?.ingredients.find(item=>item[0]===id);return ingredient?[ingredient[locale==='pt-BR'?1:2]]:[]});
 const added=extras.filter(item=>line.extraToppingIds.includes(item.id)).map(item=>item.label[locale]);
 const words=[line.crustId==='stuffed'?text[locale].stuffed:line.crustId==='thin'?text[locale].thin:text[locale].traditional];
 if(removed.length)words.push(`${text[locale].without} ${removed.join(', ')}`);if(added.length)words.push(`${text[locale].extras}: ${added.join(', ')}`);
 return {title:`${line.quantity} × ${flavorNames[line.flavorId]??flavor?.name??line.flavorId} · ${size?.label[locale]??line.sizeId}`,detail:words.join(' · ')};
}

export function KitchenApp(){
 const [locale,setLocale]=useState<Locale>('pt-BR'),[token,setToken]=useState(''),[connected,setConnected]=useState(false),[orders,setOrders]=useState<KitchenOrder[]>([]),[filter,setFilter]=useState<BoardFilter>('active'),[persistence,setPersistence]=useState<'memory'|'supabase'>('memory'),[busy,setBusy]=useState(false),[busyCode,setBusyCode]=useState(''),[error,setError]=useState(''),[announcement,setAnnouncement]=useState('');
 const t=text[locale];
 const visibleOrders=useMemo(()=>filter==='active'?orders.filter(order=>activeStatuses.includes(order.status)):orders,[filter,orders]);
 const filteredGroups=useMemo(()=>filter==='active'?activeStatuses:filter==='all'?steps:[filter],[filter]);
 async function load(currentToken=token,selectedFilter:BoardFilter=filter){
  setBusy(true);setError('');
  try{
   const query=selectedFilter==='all'||selectedFilter==='active'?'':`?status=${encodeURIComponent(selectedFilter)}`;
   const response=await fetch(`${api}/kitchen/orders${query}`,{headers:{authorization:`Bearer ${currentToken}`}});const data=await response.json();
   if(!response.ok){const code=data.error?.code;if(code==='kitchen_unavailable')setError(t.unavailable);else if(code==='kitchen_unauthorized'){setError(t.unauthorized);setConnected(false);}else setError(t.error);return false;}
   setOrders(Array.isArray(data.orders)?data.orders:[]);setPersistence(data.persistence==='supabase'?'supabase':'memory');setConnected(true);return true;
  }catch{setError(t.error);return false;}finally{setBusy(false);}
 }
 async function changeStatus(order:KitchenOrder){
  const next=nextStatus(order);if(!next)return;
  if(!window.confirm(`${t.confirm}: ${order.orderCode}\n${t.confirmText}?\n${statusName(locale,next)}`))return;
  setBusyCode(order.orderCode);setError('');
  try{
   const response=await fetch(`${api}/kitchen/orders/${encodeURIComponent(order.orderCode)}/status`,{method:'PATCH',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({expectedStatus:order.status,status:next})});const data=await response.json();
   if(response.status===409){const refreshed=await load(token,filter);if(refreshed)setError(t.conflict);return;}
   if(!response.ok){const code=data.error?.code;if(code==='kitchen_unauthorized'){setConnected(false);setError(t.unauthorized);}else if(code==='kitchen_unavailable')setError(t.unavailable);else setError(t.error);return;}
   const refreshed=await load(token,filter);if(refreshed)setAnnouncement(t.updated(order.orderCode,statusName(locale,next)));
  }catch{setError(t.error);}finally{setBusyCode('');}
 }
 function disconnect(){setToken('');setConnected(false);setOrders([]);setError('');}
 return <main className="kitchenPage">
  <header className="kitchenHeader"><a className="kitchenBrand" href="/">THE LAST SLICE <span>· {t.brand.split('· ')[1]}</span></a><div className="kitchenHeaderActions"><label className="kitchenLanguage"><span>{t.language}</span><select aria-label={t.language} value={locale} onChange={event=>setLocale(event.target.value as Locale)}><option value="pt-BR">{t.languagePt}</option><option value="en-US">{t.languageEn}</option></select></label>{connected&&<button className="kitchenGhost" onClick={disconnect}><LogOut size={16}/>{t.leave}</button>}</div></header>
  <section className="kitchenIntro"><div><p className="kitchenEyebrow"><Utensils size={15}/>{t.brand}</p><h1>{t.title}</h1><p>{t.demo}</p></div>{connected&&<button className="kitchenPrimary kitchenRefresh" disabled={busy} onClick={()=>load()}><RefreshCw size={16}/>{t.refresh}</button>}</section>
  {!connected?<form className="kitchenAccess" onSubmit={event=>{event.preventDefault();void load(token)}}><div className="kitchenLock"><Shield size={20}/></div><label htmlFor="kitchen-token">{t.token}<input id="kitchen-token" type="password" autoComplete="off" required value={token} onChange={event=>setToken(event.target.value)} placeholder={t.tokenHint}/></label><button className="kitchenPrimary" disabled={busy||!token}>{busy?t.connecting:t.connect}<ArrowRight size={17}/></button>{error&&<p role="alert" className="kitchenError">{error}</p>}</form>:<>
   <div className="kitchenToolbar"><label>{t.filter}<select value={filter} onChange={event=>{const value=event.target.value as BoardFilter;setFilter(value);void load(token,value)}}><option value="active">{t.active}</option><option value="all">{t.all}</option><option value="completed">{t.completed}</option>{steps.slice(0,5).map(status=><option key={status} value={status}>{statusName(locale,status)}</option>)}</select></label><span className="kitchenPersistence">{persistence==='supabase'?t.supabase:t.memory}</span></div>
   <div className="kitchenDemoNotice">ⓘ {t.demo}</div>{announcement&&<p role="status" aria-live="polite" className="kitchenAnnouncement">{announcement}</p>}{error&&<p role="alert" className="kitchenError">{error}</p>}
   {busy&&!orders.length?<p className="kitchenEmpty">{t.loading}</p>:!visibleOrders.length?<p className="kitchenEmpty">{t.empty}</p>:<div className="kitchenLanes">{filteredGroups.map(status=>{const group=visibleOrders.filter(order=>order.status===status);if(!group.length)return null;return <section className="kitchenLane" key={status}><header><h2>{statusName(locale,status)}</h2><span>{group.length}</span></header><div className="kitchenCards">{group.map(order=>{const next=nextStatus(order);return <article className="kitchenCard" key={order.orderCode}>
    <div className="kitchenCardTop"><div><span className="kitchenOrderLabel">{t.order}</span><strong>{order.orderCode}</strong></div><span className={`kitchenStatus ${order.status}`}>{statusName(locale,order.status)}</span></div>
    <p className="kitchenTime">{t.time(new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short'}).format(new Date(order.createdAt)))}</p>
    <div className="kitchenFulfillment">{order.fulfillment==='pickup'?t.pickup:t.delivery} · {order.locale}</div>
    <div className="kitchenLines"><h3>{t.items}</h3>{order.lines.map((line,index)=>{const summary=lineDescription(line,order.locale);return <div className="kitchenLine" key={`${line.flavorId}-${index}`}><div><strong>{summary.title}</strong><p>{summary.detail}</p></div><b>{money(line.lineTotal,locale)}</b></div>})}</div>
    <div className="kitchenTotal"><span>{t.total}</span><strong>{money(order.total,locale)}</strong></div>
    {next&&<button className="kitchenPrimary kitchenNext" disabled={busyCode===order.orderCode} onClick={()=>void changeStatus(order)}>{busyCode===order.orderCode?t.connecting:`${t.next} ${statusName(locale,next)}`}<ArrowRight size={16}/></button>}
   </article>})}</div></section>})}</div>}
  </>}
 </main>;
}
