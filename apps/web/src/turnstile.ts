const siteKey=import.meta.env.VITE_TURNSTILE_SITE_KEY||'';
type TurnstileApi={render:(el:HTMLElement,options:{sitekey:string;callback:(token:string)=>void;'error-callback':()=>void; 'expired-callback':()=>void})=>string;remove:(id:string)=>void};
declare global {interface Window {turnstile?:TurnstileApi}}

export async function getTurnstileToken():Promise<string|undefined>{
 if(!siteKey)return undefined;
 if(!window.turnstile){await new Promise<void>((resolve,reject)=>{const existing=document.querySelector<HTMLScriptElement>('script[data-turnstile]');if(existing){existing.addEventListener('load',()=>resolve(),{once:true});existing.addEventListener('error',()=>reject(new Error('challenge_unavailable')),{once:true});return;}const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true;script.dataset.turnstile='true';script.onload=()=>resolve();script.onerror=()=>reject(new Error('challenge_unavailable'));document.head.append(script);});}
 const root=document.createElement('div');root.style.cssText='position:fixed;inset:0;z-index:9999;background:#000a;display:grid;place-items:center';const panel=document.createElement('div');panel.style.cssText='padding:24px;background:#191919;border-radius:16px';root.append(panel);document.body.append(root);
 try{return await new Promise<string>((resolve,reject)=>{const id=window.turnstile!.render(panel,{sitekey:siteKey,callback:resolve,'error-callback':()=>reject(new Error('challenge_unavailable')),'expired-callback':()=>reject(new Error('challenge_expired'))});void id;});}finally{root.remove();}
}
