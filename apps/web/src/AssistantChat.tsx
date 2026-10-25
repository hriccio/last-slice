import React,{useEffect,useRef,useState} from 'react';
import {MessageCircle,Send,X} from 'lucide-react';
import type {AssistantTicket,AssistantTurn,Locale,CartSnapshot,CartProposal,ProposalCandidate} from '@last-slice/contracts';
type Context={cartSnapshot?:CartSnapshot;screen:'menu'|'customization'|'cart'|'checkout';selection?:unknown;cartLines?:unknown[];fulfillment?:string};
const api=import.meta.env.VITE_API_URL||'http://localhost:3001';
const labels={
 'pt-BR':{open:'Perguntar à pizzaria',close:'Fechar assistente',title:'Ajuda da pizzaria',intro:'Converse sobre sabores e opções. Não envie dados pessoais.',placeholder:'O que você tem vontade de comer?',send:'Enviar mensagem',empty:'Como posso ajudar com sua pizza?',busy:'Preparando a resposta…',error:'A ajuda está indisponível agora. Você pode continuar seu pedido.',fake:'Prévia local de desenvolvimento',disclaimer:'Demonstração. Confira opções e valores nos controles do pedido.',new:'Nova conversa',cancel:'Sair da fila',queued:'Aguardando disponibilidade da IA',position:'Posição na fila',estimate:'Resposta estimada em cerca de',average:'Tempo médio recente para responder',initial:'Estimativa inicial',noAverage:'Ainda sem média recente',expired:'Sua espera expirou. Envie novamente quando quiser.',full:'A fila está cheia. Tente novamente em instantes.',budget:'O limite diário da IA foi atingido. Disponível novamente em',pending:'Sua conversa já tem uma mensagem aguardando.',large:'A mensagem ou o contexto está muito longo. Tente uma pergunta mais curta.',stale:'Esta resposta se refere à seleção anterior. Confira o orçamento atual.',seconds:'s'},
 'en-US':{open:'Ask the pizzeria',close:'Close assistant',title:'Pizzeria help',intro:'Talk about flavors and options. Do not share personal details.',placeholder:'What are you in the mood for?',send:'Send message',empty:'How can I help with your pizza?',busy:'Preparing your answer…',error:'Help is unavailable right now. You can continue ordering.',fake:'Local development preview',disclaimer:'Demo information. Confirm options and prices in the order controls.',new:'New conversation',cancel:'Leave queue',queued:'Waiting for AI availability',position:'Queue position',estimate:'Estimated reply in about',average:'Recent average time to answer',initial:'Initial estimate',noAverage:'No recent average yet',expired:'Your wait expired. Send again whenever you like.',full:'The queue is full. Try again shortly.',budget:'The daily AI limit has been reached. Available again at',pending:'Your conversation already has a message waiting.',large:'The message or context is too long. Try a shorter question.',stale:'This answer relates to the earlier selection. Check the current quote.',seconds:'sec'}
};
const capability=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
const duration=(seconds:number)=>seconds<60?`${Math.max(1,Math.ceil(seconds/5)*5)} s`:`${Math.ceil(seconds/60)} min`;
export function AssistantChat({locale,context,visible,onOpen,onClose,onApply,onReview}:{locale:Locale;context:Context;visible:boolean;onOpen:()=>void;onClose:()=>void;onApply?:(proposal:CartProposal)=>void;onReview?:()=>void}){
 const [turns,setTurns]=useState<(AssistantTurn&{id?:string})[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[fake,setFake]=useState(false),[ticket,setTicket]=useState<AssistantTicket|null>(null),[stale,setStale]=useState(false);
 const [proposal,setProposal]=useState<CartProposal|null>(null),[applying,setApplying]=useState(false),[applied,setApplied]=useState(false);const proposalBase=useRef(''),proposalDraft=useRef<ProposalCandidate|null>(null),appliedIds=useRef(new Set<string>());
 const ptxt=locale==='pt-BR'?{pending:'Proposta — a sacola ainda não mudou',apply:'Aplicar à sacola',adjust:'Ajustar',dismiss:'Descartar',applied:'Sacola atualizada',review:'Revisar pedido demonstrativo',stale:'A sacola ou o cardápio mudou, ou a proposta expirou. Peça uma nova proposta.',before:'Antes',after:'Proposta',total:'Total da sacola',pickup:'Retirada',delivery:'Entrega',remove:'Remover item'}:{pending:'Proposal — your cart has not changed yet',apply:'Apply to cart',adjust:'Adjust',dismiss:'Dismiss',applied:'Cart updated',review:'Review demo order',stale:'The cart or menu changed, or the proposal expired. Ask for a new proposal.',before:'Before',after:'Proposed',total:'Cart total',pickup:'Pickup',delivery:'Delivery',remove:'Remove item'};
 const t=labels[locale],listRef=useRef<HTMLDivElement>(null),inputRef=useRef<HTMLInputElement>(null),launchRef=useRef<HTMLButtonElement>(null),openedBefore=useRef(false);
 const cap=useRef(capability()),candidate=useRef<{id:string;text:string;contextKey:string;payload:unknown;cap:string}|null>(null),live=useRef(true),visibleRef=useRef(visible),busyRef=useRef(false),contextRef=useRef(context),ticketRef=useRef(ticket);
 visibleRef.current=visible;contextRef.current=context;ticketRef.current=ticket;
 const headers=()=>({'content-type':'application/json',authorization:`Bearer ${cap.current}`});
 const cancelRemote=(id:string,token=cap.current)=>fetch(`${api}/assistant/requests/${id}`,{method:'DELETE',headers:{authorization:`Bearer ${token}`}}).catch(()=>{});
 const errorText=(code:string,resetsAt?:string)=>code==='assistant_queue_full'?t.full:code==='assistant_budget_exhausted'?`${t.budget} ${resetsAt?new Date(resetsAt).toLocaleString(locale):'UTC'}.`:code==='assistant_request_expired'?t.expired:code==='assistant_already_pending'?t.pending:code==='assistant_input_too_large'?t.large:t.error;
 function fail(code:string,resetsAt?:string){const id=candidate.current?.id;setError(errorText(code,resetsAt));setMessage(candidate.current?.text||'');setTurns(old=>old.filter(x=>x.id!==id));setTicket(null);busyRef.current=false;setBusy(false);}
 function finish(body:AssistantTicket){
  if(body.state==='completed'){
   setProposal(body.proposal||null);proposalDraft.current=body.proposal?.candidate||null;setApplied(false);proposalBase.current=JSON.stringify((candidate.current?.payload as any)?.context?.cartSnapshot);if(body.proposalError)setError(ptxt.stale);
   setTurns(old=>[...old,{role:'assistant' as const,content:String(body.reply)}].slice(-20));setFake(body.mode==='development_fake');setStale(candidate.current?.contextKey!==JSON.stringify(contextRef.current));candidate.current=null;setTicket(null);busyRef.current=false;setBusy(false);
  }else if(['expired','cancelled','failed'].includes(body.state))fail(body.error||'assistant_request_expired',body.resetsAt);
  else setTicket(body);
 }
 useEffect(()=>{live.current=true;return()=>{live.current=false;if(candidate.current)void cancelRemote(candidate.current.id,candidate.current.cap);};},[]);
 useEffect(()=>{if(visible){openedBefore.current=true;inputRef.current?.focus();}else if(openedBefore.current){launchRef.current?.focus();openedBefore.current=false;}},[visible]);
 useEffect(()=>{if(visible)listRef.current?.scrollTo({top:listRef.current.scrollHeight});},[visible,turns]);
 useEffect(()=>{
  if(!ticket?.requestId||!visible)return;
  let active=true,inFlight=false,timer=0;const id=ticket.requestId;
  const poll=async()=>{
   if(!active||inFlight||document.visibilityState!=='visible')return;
   inFlight=true;let interval=3;
   try{const response=await fetch(`${api}/assistant/requests/${id}`,{headers:headers()});const body=await response.json();if(!active)return;
    if(!response.ok){if(response.status===410){fail('assistant_request_expired');return;}setError(errorText(body.error?.code,body.resetsAt));}
    else {setError('');interval=Math.max(3,body.pollAfterSeconds||3);finish(body);if(['completed','cancelled','expired','failed'].includes(body.state))return;}
   }catch{if(active)setError(t.error);}
   finally{inFlight=false;}
   if(active)timer=window.setTimeout(poll,interval*1000);
  };
  const visibility=()=>{window.clearTimeout(timer);if(document.visibilityState==='visible')void poll();};
  timer=window.setTimeout(poll,Math.max(3,ticket.pollAfterSeconds||3)*1000);document.addEventListener('visibilitychange',visibility);
  return()=>{active=false;window.clearTimeout(timer);document.removeEventListener('visibilitychange',visibility);};
 },[ticket?.requestId,visible,locale]);
 async function leave(){
  if(ticketRef.current?.state==='running')return;
  if(candidate.current)void cancelRemote(candidate.current.id,candidate.current.cap);
  const id=candidate.current?.id;
  if(ticketRef.current?.state==='queued'){setMessage(candidate.current?.text||'');setTurns(old=>old.filter(x=>x.id!==id));}
  setTicket(null);busyRef.current=false;setBusy(false);candidate.current=null;
 }
 async function submit(event:React.FormEvent){
  event.preventDefault();const text=message.trim();if(!text||busyRef.current||applying)return;
  if(new TextEncoder().encode(text).length>1200){setError(t.large);return;}
  dismissProposal(true);
  const contextKey=JSON.stringify(context),history=turns.slice(-10).map(({role,content})=>({role,content}));
  if(candidate.current?.text!==text||candidate.current.contextKey!==contextKey)candidate.current={id:crypto.randomUUID(),text,contextKey,cap:cap.current,payload:{locale,message:text,history,context:{...context,...(proposalDraft.current?{draftProposal:proposalDraft.current}:{})}}};
  const request=candidate.current;busyRef.current=true;setBusy(true);setError('');setStale(false);
  try{
   const response=await fetch(`${api}/assistant/messages`,{method:'POST',headers:headers(),body:JSON.stringify({...request.payload as object,requestId:request.id})});const body=await response.json();
   if(!live.current||!visibleRef.current||candidate.current!==request){if(response.status===202)void cancelRemote(request.id,request.cap);return;}
   if(!response.ok){fail(body.error?.code||'assistant_unavailable',body.resetsAt);return;}
   setTurns(old=>[...old.filter(x=>x.id!==request.id),{role:'user' as const,content:text,id:request.id}].slice(-20));setMessage('');
   if(response.status===202)finish(body);else finish({...body,state:'completed'});
  }catch{if(live.current){setError(t.error);busyRef.current=false;setBusy(false);}}
 }
 const proposalStale=!!proposal&&(proposal.baseRevision!==context.cartSnapshot?.revision||proposalBase.current!==JSON.stringify(context.cartSnapshot)||Date.parse(proposal.expiresAt)<=Date.now());
 function dismissProposal(keepDraft=false){if(!keepDraft)proposalDraft.current=null;if(proposal)void fetch(`${api}/assistant/proposals/${proposal.id}`,{method:'DELETE',headers:headers()}).catch(()=>{});setProposal(null);setApplied(false);}
 async function applyProposal(){
  if(!proposal||applying||!onApply||appliedIds.current.has(proposal.id))return;
  if(proposalStale){setError(ptxt.stale);return;}
  const base=JSON.stringify(contextRef.current.cartSnapshot),token=cap.current,id=proposal.id;
  setApplying(true);setError('');
  try{
   const r=await fetch(`${api}/assistant/proposals/${id}/confirm`,{method:'POST',headers:headers(),body:JSON.stringify({cartSnapshot:contextRef.current.cartSnapshot})});const body=await r.json();
   if(!live.current||cap.current!==token)return;
   if(!r.ok||base!==JSON.stringify(contextRef.current.cartSnapshot))throw new Error('proposal_stale');
   if(!appliedIds.current.has(id)){appliedIds.current.add(id);onApply(body.proposal);proposalDraft.current=null;setApplied(true);setTurns(old=>[...old,{role:'assistant' as const,content:ptxt.applied}].slice(-20));}
  }catch{if(live.current)setError(ptxt.stale);}finally{if(live.current)setApplying(false);}
 }
 if(!visible)return <button ref={launchRef} className="assistantLaunch" aria-label={t.open} title={t.open} onClick={()=>{setError('');onOpen();}}><MessageCircle size={20}/><span>{t.open}</span></button>;
 return <section className="assistantPanel" role="dialog" aria-modal="false" aria-labelledby="assistantTitle">
  <header><div><strong id="assistantTitle">{t.title}</strong><p>{t.intro}</p></div><button aria-label={t.new} onClick={()=>{dismissProposal();void leave();setTurns([]);setError('');setTicket(null);setBusy(false);busyRef.current=false;candidate.current=null;cap.current=capability();}}>{t.new}</button><button aria-label={t.close} title={t.close} onClick={()=>{void leave();onClose();}}><X size={18}/></button></header>
  <div className="assistantConversation" ref={listRef} aria-live="polite" aria-relevant="additions">{!turns.length&&<p className="assistantEmpty">{t.empty}</p>}{turns.map((turn,index)=><p className={`assistantMessage ${turn.role}`} key={`${index}-${turn.role}`}>{turn.content}</p>)}{proposal&&<div className="assistantProposal" aria-label={ptxt.pending}>
   <p role="status">{applied?ptxt.applied:ptxt.pending}</p>
   {!applied&&<><p>{proposal.operation==='remove'?ptxt.remove:ptxt.after}: {proposal.summary}</p>{proposal.beforeSummary&&proposal.operation==='update'&&<p>{ptxt.before}: {proposal.beforeSummary}</p>}<p>{proposal.fulfillment==='pickup'?ptxt.pickup:ptxt.delivery} · {ptxt.total}: {new Intl.NumberFormat(locale,{style:'currency',currency:'BRL'}).format(proposal.quote.total/100)}</p>{proposalStale&&<p role="status">{ptxt.stale}</p>}<div className="proposalActions"><button disabled={applying||proposalStale||!onApply} onClick={()=>void applyProposal()}>{ptxt.apply}</button><button disabled={applying} onClick={()=>{dismissProposal(true);inputRef.current?.focus();}}>{ptxt.adjust}</button><button disabled={applying} onClick={()=>dismissProposal()}>{ptxt.dismiss}</button></div></>}
   {applied&&<button onClick={onReview}>{ptxt.review}</button>}
  </div>}</div>
  {busy&&<div className="assistantQueue"><p role="status" aria-live="polite">{ticket?.state==='queued'?t.queued:t.busy}</p>{ticket&&<><p>{ticket.position?`${t.position}: ${ticket.position}. `:''}{t.estimate} {duration(ticket.estimatedReplySeconds??8)}.</p><p>{ticket.recentAverageReplySeconds!==undefined?`${t.average}: ${duration(ticket.recentAverageReplySeconds)}.`:`${t.initial} · ${t.noAverage}`}</p>{ticket.state==='queued'&&<button onClick={()=>void leave()}>{t.cancel}</button>}</>}</div>}
  <p className="assistantDisclaimer">{fake&&<strong>{t.fake} · </strong>}{t.disclaimer}</p>{stale&&<p role="status" className="assistantError">{t.stale}</p>}{error&&<p className="assistantError" role="alert">{error}</p>}
  <form onSubmit={submit}><input ref={inputRef} readOnly={busy} maxLength={1200} value={message} onChange={e=>setMessage(e.target.value)} placeholder={t.placeholder} aria-label={t.placeholder}/><button type="submit" aria-disabled={busy||!message.trim()} aria-busy={busy} aria-label={t.send} title={t.send}><Send size={17}/></button></form>
 </section>;
}
export function AssistantTrigger({locale,onClick}:{locale:Locale;onClick:()=>void}){const t=labels[locale];return <button className="assistantLaunch" aria-label={t.open} title={t.open} onClick={onClick}><MessageCircle size={20}/><span>{t.open}</span></button>}
