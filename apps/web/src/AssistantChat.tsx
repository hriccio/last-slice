import React,{useEffect,useRef,useState} from 'react';
import {MessageCircle,Send,X} from 'lucide-react';
import type {Locale} from '@last-slice/contracts';

type Turn={role:'user'|'assistant';content:string};
type Context={screen:'menu'|'customization'|'cart'|'checkout';selection?:unknown;cartLines?:unknown[];fulfillment?:string};
const api=import.meta.env.VITE_API_URL||'http://localhost:3001';
const labels={
 'pt-BR':{open:'Perguntar à pizzaria',close:'Fechar assistente',title:'Ajuda da pizzaria',intro:'Ajuda opcional para o cardápio demonstrativo. Não envie dados pessoais; suas escolhas continuam nos controles do app.',placeholder:'Pergunte sobre sabores ou ingredientes',send:'Enviar mensagem',empty:'Como posso ajudar com o cardápio?',busy:'Pensando…',error:'A ajuda está indisponível agora. Seu pedido continua como estava.',fake:'Prévia local de desenvolvimento',disclaimer:'Informações demonstrativas. Confira opções e valores nos controles do pedido.',new:'Nova conversa'},
 'en-US':{open:'Ask the pizzeria',close:'Close assistant',title:'Pizzeria help',intro:'Optional help for the demo menu. Do not share personal details; your selections stay in the app controls.',placeholder:'Ask about flavors or ingredients',send:'Send message',empty:'How can I help with the menu?',busy:'Thinking…',error:'Help is unavailable right now. Your order is unchanged.',fake:'Local development preview',disclaimer:'Demo information. Confirm options and prices in the ordering controls.',new:'New conversation'}
};

export function AssistantChat({locale,context,visible,onOpen,onClose}:{locale:Locale;context:Context;visible:boolean;onOpen:()=>void;onClose:()=>void}){
 const [turns,setTurns]=useState<Turn[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[fake,setFake]=useState(false);
 const t=labels[locale],listRef=useRef<HTMLDivElement>(null),inputRef=useRef<HTMLInputElement>(null),launchRef=useRef<HTMLButtonElement>(null),openedBefore=useRef(false);
 useEffect(()=>{if(visible){openedBefore.current=true;inputRef.current?.focus();}else if(openedBefore.current){launchRef.current?.focus();openedBefore.current=false;}},[visible]);
 useEffect(()=>{if(visible)listRef.current?.scrollTo({top:listRef.current.scrollHeight});},[visible,turns,busy]);
 if(!visible)return <button ref={launchRef} className="assistantLaunch" aria-label={t.open} title={t.open} onClick={()=>{setError('');onOpen()}}><MessageCircle size={20}/><span>{t.open}</span></button>;
 async function submit(event:React.FormEvent){event.preventDefault();const text=message.trim();if(!text||busy)return;const history=turns.slice(-10);const userTurn:Turn={role:'user',content:text};setTurns(old=>[...old,userTurn].slice(-20));setMessage('');setBusy(true);setError('');try{const response=await fetch(`${api}/assistant/messages`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({locale,message:text,history,context})});const body=await response.json();if(!response.ok)throw new Error(body.error?.code||'assistant_unavailable');const assistantTurn:Turn={role:'assistant',content:String(body.reply)};setTurns(old=>[...old,assistantTurn].slice(-20));setFake(body.mode==='development_fake');}catch{setError(t.error);setMessage(text);}finally{setBusy(false);}}
 return <section className="assistantPanel" role="dialog" aria-modal="false" aria-labelledby="assistantTitle">
  <header><div><strong id="assistantTitle">{t.title}</strong><p>{t.intro}</p></div><button aria-label={t.close} title={t.close} onClick={onClose}><X size={18}/></button></header>
  <div className="assistantConversation" ref={listRef} aria-live="polite">{!turns.length&&<p className="assistantEmpty">{t.empty}</p>}{turns.map((turn,index)=><p className={`assistantMessage ${turn.role}`} key={`${index}-${turn.role}`}>{turn.content}</p>)}{busy&&<p className="assistantMessage assistant">{t.busy}</p>}</div>
  <p className="assistantDisclaimer">{fake&&<strong>{t.fake} · </strong>}{t.disclaimer}</p>{error&&<p className="assistantError" role="alert">{error}</p>}
  <form onSubmit={submit}><input ref={inputRef} maxLength={1200} value={message} onChange={e=>setMessage(e.target.value)} placeholder={t.placeholder} aria-label={t.placeholder}/><button type="submit" disabled={busy||!message.trim()} aria-label={t.send} title={t.send}><Send size={17}/></button></form>
 </section>;
}

export function AssistantTrigger({locale,onClick}:{locale:Locale;onClick:()=>void}){const t=labels[locale];return <button className="assistantLaunch" aria-label={t.open} title={t.open} onClick={onClick}><MessageCircle size={20}/><span>{t.open}</span></button>}
