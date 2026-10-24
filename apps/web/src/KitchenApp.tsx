import {useEffect,useRef,useState} from 'react';
import {flavors,sizes,extras,staffMessage,type KitchenOrder,type StaffEvent,type Locale,type Status} from '@last-slice/contracts';
import {LegacyKitchenApp} from './LegacyKitchenApp';
const api=import.meta.env.VITE_API_URL||'http://localhost:3001';
const statuses:Status[]=['received','confirmed','preparing','ready_for_pickup','out_for_delivery','completed','cancelled'];
const copy={
 'pt-BR':{title:'Cozinha de demonstração',brand:'THE LAST SLICE · DEMONSTRAÇÃO',intro:'Uma cozinha compartilhada para assistir. Equipe, conversa e preparo são simulados; não há pagamento ou entrega real.',customer:'Fazer um pedido demonstrativo',staff:'Conversa da equipe simulada',empty:'A cozinha está tranquila. Os pedidos demonstrativos aparecerão aqui.',chatEmpty:'A equipe simulada vai conversar quando os pedidos avançarem.',refresh:'Atualizar quadro',refreshing:'Atualizando…',last:'Última consulta',error:'Não foi possível atualizar. Mantemos a última consulta; tente novamente.',unavailable:'A cozinha está indisponível agora. Tente atualizar.',all:'Todos',active:'Em andamento',filter:'Filtrar status',fulfillment:'Modalidade',pickup:'Retirada',delivery:'Entrega',received:'Recebido',confirmed:'Confirmado',preparing:'Em preparo',ready_for_pickup:'Pronto para retirada',out_for_delivery:'Saiu para entrega',completed:'Concluído',cancelled:'Cancelado',memory:'Prévia local temporária: reiniciar a API apaga estes pedidos.',stored:'Os pedidos fictícios expiram em até 24 horas.',readonly:'Somente leitura · equipe simulada',newMessages:'novas mensagens simuladas',latest:'Ver mensagens mais recentes',counter:'Atendimento fictício',cook:'Pizzaiolo fictício',oven:'Forno fictício',courier:'Entrega fictícia',items:'Itens',total:'Total',noOrders:'Nenhum pedido neste filtro.',data:'Sem cadastro. Usamos dados fictícios no checkout. Não envie dados pessoais no chat. As conversas com IA são transitórias no app; o provedor pode manter registros por até 30 dias. Logs de acesso dependem da hospedagem.'},
 'en-US':{title:'Demo kitchen',brand:'THE LAST SLICE · DEMO',intro:'One shared kitchen to watch. Staff, conversation and preparation are simulated; no real payment or delivery takes place.',customer:'Place a demo order',staff:'Simulated staff conversation',empty:'The kitchen is quiet. Demo orders will appear here.',chatEmpty:'Simulated staff will chat as orders progress.',refresh:'Refresh board',refreshing:'Refreshing…',last:'Last checked',error:'Could not refresh. Keeping the last snapshot; try again.',unavailable:'The kitchen is unavailable right now. Try refreshing.',all:'All',active:'Active',filter:'Filter status',fulfillment:'Fulfillment',pickup:'Pickup',delivery:'Delivery',received:'Received',confirmed:'Confirmed',preparing:'Preparing',ready_for_pickup:'Ready for pickup',out_for_delivery:'Out for delivery',completed:'Completed',cancelled:'Cancelled',memory:'Temporary local preview: restarting the API clears these orders.',stored:'Fictional orders expire within 24 hours.',readonly:'Read only · simulated staff',newMessages:'new simulated messages',latest:'Show latest messages',counter:'Fictional counter staff',cook:'Fictional pizza cook',oven:'Fictional oven staff',courier:'Fictional delivery staff',items:'Items',total:'Total',noOrders:'No orders match this filter.',data:'No registration. Checkout uses fictional data. Do not send personal details in chat. AI conversations are transient in the app; the provider may retain logs for up to 30 days. Access logs depend on hosting.'}
};
export function KitchenApp(){
 const [mode,setMode]=useState<boolean|null>(null);
 useEffect(()=>{let active=true;fetch(`${api}/config`).then(r=>r.ok?r.json():Promise.reject()).then(d=>{if(active)setMode(Boolean(d.publicDemo));}).catch(()=>{if(active)setMode(true);});return()=>{active=false;};},[]);
 if(mode===false)return <LegacyKitchenApp/>;
 if(mode===null)return <main className="publicKitchen"><p role="status">THE LAST SLICE · DEMO</p></main>;
 return <PublicKitchen/>;
}
function PublicKitchen(){
 const [locale,setLocale]=useState<Locale>(()=>localStorage.getItem('locale')==='en-US'?'en-US':'pt-BR'),[status,setStatus]=useState('active'),[fulfillment,setFulfillment]=useState('all');
 const [orders,setOrders]=useState<KitchenOrder[]>([]),[events,setEvents]=useState<StaffEvent[]>([]),[checked,setChecked]=useState<Date|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(false),[persistence,setPersistence]=useState('memory'),[announcement,setAnnouncement]=useState(''),[unread,setUnread]=useState(0);
 const t=copy[locale],refreshRef=useRef<()=>void>(()=>{}),feed=useRef<HTMLDivElement>(null),atBottom=useRef(true),seen=useRef<Set<string>|null>(null);
 useEffect(()=>{localStorage.setItem('locale',locale);document.documentElement.lang=locale;},[locale]);
 useEffect(()=>{
  let active=true,inFlight=false,timer=0;let controller:AbortController;
  const refresh=async()=>{
   if(!active||inFlight||document.visibilityState!=='visible')return;
   inFlight=true;window.clearTimeout(timer);controller=new AbortController();setBusy(true);
   try{
    const params=new URLSearchParams();if(!['active','all'].includes(status))params.set('status',status);if(fulfillment!=='all')params.set('fulfillment',fulfillment);
    const response=await fetch(`${api}/kitchen/orders?${params}`,{signal:controller.signal});if(!response.ok)throw new Error();const data=await response.json();if(!active)return;
    const fresh:StaffEvent[]=data.messages||[];const added=seen.current?fresh.filter(e=>!seen.current!.has(e.id)):[];seen.current=new Set(fresh.map(e=>e.id));
    if(added.length){setAnnouncement(`${added.length} ${t.newMessages} · ${new Date(added.at(-1)!.createdAt).toLocaleTimeString(locale)}`);if(!atBottom.current)setUnread(n=>n+added.length);}
    setOrders(data.orders);setEvents(fresh);setPersistence(data.persistence);setChecked(new Date());setError(false);
   }catch{if(active)setError(true);}finally{inFlight=false;if(active){setBusy(false);timer=window.setTimeout(refresh,15000);}}
  };
  refreshRef.current=()=>void refresh();const visibility=()=>{window.clearTimeout(timer);if(document.visibilityState==='visible')void refresh();};
  document.addEventListener('visibilitychange',visibility);void refresh();
  return()=>{active=false;controller?.abort();window.clearTimeout(timer);document.removeEventListener('visibilitychange',visibility);};
 },[locale,status,fulfillment]);
 useEffect(()=>{if(atBottom.current&&feed.current)feed.current.scrollTop=feed.current.scrollHeight;},[events]);
 const visible=orders.filter(o=>(status!=='active'||!['completed','cancelled'].includes(o.status))&&(fulfillment==='all'||o.fulfillment===fulfillment));
 const money=(v:number)=>new Intl.NumberFormat(locale,{style:'currency',currency:'BRL'}).format(v/100);
 return <main className="publicKitchen">
  <header className="publicKitchenHeader"><div><p className="eyebrow">{t.brand}</p><h1>{t.title}</h1><p>{t.intro}</p></div><div className="publicKitchenLinks"><button onClick={()=>setLocale(locale==='pt-BR'?'en-US':'pt-BR')} aria-label={locale==='pt-BR'?'Switch to English':'Mudar para português'}>{locale==='pt-BR'?'PT / EN':'EN / PT'}</button><a href="/">{t.customer}</a></div></header>
  <p className="publicKitchenNotice">{t.readonly} · {persistence==='memory'?t.memory:t.stored}</p>
  <div className="publicKitchenControls"><label>{t.filter}<select aria-label={t.filter} value={status} onChange={e=>setStatus(e.target.value)}><option value="active">{t.active}</option><option value="all">{t.all}</option>{statuses.map(s=><option value={s} key={s}>{t[s]}</option>)}</select></label><label>{t.fulfillment}<select aria-label={t.fulfillment} value={fulfillment} onChange={e=>setFulfillment(e.target.value)}><option value="all">{t.all}</option><option value="pickup">{t.pickup}</option><option value="delivery">{t.delivery}</option></select></label><button aria-busy={busy} aria-disabled={busy} onClick={()=>refreshRef.current()}>{busy?t.refreshing:t.refresh}</button>{checked&&<span>{t.last}: <time dateTime={checked.toISOString()}>{checked.toLocaleTimeString(locale)}</time></span>}</div>
  {error&&<p className="publicKitchenError" role="alert">{checked?t.error:t.unavailable}</p>}
  <div className="publicKitchenLayout"><section aria-label={t.items} className="publicKitchenOrders">{!visible.length&&<p>{orders.length?t.noOrders:t.empty}</p>}{statuses.filter(s=>visible.some(o=>o.status===s)).map(stage=><section className="publicKitchenLane" key={stage}><h2>{t[stage]}</h2>{visible.filter(o=>o.status===stage).map(order=><article className="publicKitchenCard" key={order.orderCode}><header><strong>{order.orderCode}</strong><span>{order.fulfillment==='pickup'?t.pickup:t.delivery}</span></header>{order.lines.map((line,i)=>{
   const flavor=flavors.find(f=>f.id===line.flavorId);const removed=flavor?.ingredients.filter(i=>line.removedIngredientIds.includes(i[0])).map(i=>i[locale==='pt-BR'?1:2])||[];const added=extras.filter(e=>line.extraToppingIds.includes(e.id)).map(e=>e.label[locale]);
   return <p key={i}>{line.quantity} × {flavor?.name} · {sizes.find(s=>s.id===line.sizeId)?.label[locale]} · {line.crustId==='traditional'?(locale==='pt-BR'?'Massa tradicional':'Traditional crust'):line.crustId==='thin'?(locale==='pt-BR'?'Massa fina':'Thin crust'):(locale==='pt-BR'?'Borda de Catupiry':'Catupiry-stuffed crust')}{removed.length?` · ${locale==='pt-BR'?'Sem':'Without'} ${removed.join(', ')}`:''}{added.length?` · ${locale==='pt-BR'?'Adicionais':'Extras'}: ${added.join(', ')}`:''}</p>;
  })}<footer><span>{t.total}</span><strong>{money(order.total)}</strong></footer></article>)}</section>)}</section>
  <aside className="publicStaff"><h2>{t.staff}</h2><p>{t.readonly}</p><p className="srOnly" role="status" aria-live="polite">{announcement}</p><div className="publicStaffFeed" ref={feed} role="log" aria-label={t.staff} aria-live="off" tabIndex={0} onScroll={()=>{const el=feed.current!;atBottom.current=el.scrollHeight-el.clientHeight-el.scrollTop<30;if(atBottom.current)setUnread(0);}}>{!events.length&&<p>{t.chatEmpty}</p>}{events.map(event=><article key={event.id} className="publicStaffMessage"><header><strong>{event.speaker==='delivery'?t.courier:t[event.speaker]}</strong><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleTimeString(locale)}</time></header><p>{staffMessage(event,locale)}</p></article>)}</div><button aria-label={t.latest} onClick={()=>{atBottom.current=true;feed.current?.scrollTo({top:feed.current.scrollHeight});setUnread(0);}}>{unread?`${unread} ${t.newMessages} · `:''}{t.latest}</button></aside></div>
  <footer className="publicDataNotice">{t.data}</footer>
 </main>;
}
