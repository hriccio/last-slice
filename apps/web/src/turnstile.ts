const siteKey=import.meta.env.VITE_TURNSTILE_SITE_KEY||'';
type TurnstileApi={render:(el:HTMLElement,options:{sitekey:string;callback:(token:string)=>void;'error-callback':()=>void; 'expired-callback':()=>void})=>string;remove:(id:string)=>void};
declare global {interface Window {turnstile?:TurnstileApi}}

export async function getTurnstileToken():Promise<string|undefined>{
 if(!siteKey)return undefined;
 if(!window.turnstile){await new Promise<void>((resolve,reject)=>{const existing=document.querySelector<HTMLScriptElement>('script[data-turnstile]');const script=existing||document.createElement('script');const timer=window.setTimeout(()=>reject(new Error('challenge_unavailable')),15000);const loaded=()=>{window.clearTimeout(timer);if(window.turnstile)resolve();else reject(new Error('challenge_unavailable'));};const failed=()=>{window.clearTimeout(timer);reject(new Error('challenge_unavailable'));};script.addEventListener('load',loaded,{once:true});script.addEventListener('error',failed,{once:true});if(!existing){script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true;script.dataset.turnstile='true';document.head.append(script);}});}
 const root=document.createElement('div');root.style.cssText='position:fixed;inset:0;z-index:9999;background:#000a;display:grid;place-items:center';const panel=document.createElement('div');panel.style.cssText='padding:24px;background:#191919;border-radius:16px';root.append(panel);document.body.append(root);
 try{return await new Promise<string>((resolve,reject)=>{const timer=window.setTimeout(()=>reject(new Error('challenge_unavailable')),45000);window.turnstile!.render(panel,{sitekey:siteKey,callback:token=>{window.clearTimeout(timer);resolve(token);},'error-callback':()=>{window.clearTimeout(timer);reject(new Error('challenge_unavailable'));},'expired-callback':()=>{window.clearTimeout(timer);reject(new Error('challenge_expired'));}});});}finally{root.remove();}
}
