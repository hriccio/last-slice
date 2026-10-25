import {createHash,randomUUID} from 'node:crypto';
import {calculate,flavors,sizes,extras,type CartLine,type CartSnapshot,type CartProposal,type ProposalCandidate,type Locale} from '@last-slice/contracts';
const invalid=()=>new Error('proposal_invalid');
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function cartLine(value:any):CartLine{
 const fields=['flavorId','sizeId','crustId','removedIngredientIds','extraToppingIds','quantity'];
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!fields.includes(k)))throw invalid();
 if(!Array.isArray(value.removedIngredientIds)||!Array.isArray(value.extraToppingIds))throw invalid();
 calculate([value],'pickup');
 return {flavorId:value.flavorId,sizeId:value.sizeId,crustId:value.crustId,removedIngredientIds:[...value.removedIngredientIds].sort(),extraToppingIds:[...value.extraToppingIds].sort(),quantity:value.quantity};
}
export function cartSnapshot(value:any):CartSnapshot{
 if(!value||Object.keys(value).some(k=>!['revision','fulfillment','lines'].includes(k))||!Number.isSafeInteger(value.revision)||value.revision<0||!['pickup','delivery'].includes(value.fulfillment)||!Array.isArray(value.lines)||value.lines.length>10)throw invalid();
 const ids=new Set();
 const lines=value.lines.map((item:any)=>{
  if(!item||typeof item.lineId!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(item.lineId)||ids.has(item.lineId))throw invalid();ids.add(item.lineId);
  const {lineId,...line}=item;return {lineId,...cartLine(line)};
 });
 return {revision:value.revision,fulfillment:value.fulfillment,lines};
}
const plain=(line:any)=>{const {lineId,...value}=line;return value as CartLine;};
const identity=(line:CartLine)=>JSON.stringify({...line,quantity:1});
export type ProposalMenu={signature:string;availableIds:string[]};
interface Entry{owner:string;base:CartSnapshot;locale:Locale;expires:number;proposal?:CartProposal;menu?:string;discarded?:boolean}
export class ProposalStore{
 private entries=new Map<string,Entry>();
 constructor(private now:()=>number=Date.now){}
 register(requestId:string,cap:string,snapshot:CartSnapshot,locale:Locale){
  for(const [id,e]of this.entries)if(e.expires<=this.now())this.entries.delete(id);
  const old=this.entries.get(requestId);if(old){if(old.owner!==hash(cap))throw invalid();return;}
  if(this.entries.size>=5000)throw new Error('assistant_queue_full');
  this.entries.set(requestId,{owner:hash(cap),base:structuredClone(snapshot),locale,expires:this.now()+600000});
 }
 async present(requestId:string,cap:string,candidate:unknown,menu:ProposalMenu):Promise<CartProposal|undefined>{
  const e=this.entries.get(requestId);if(!e||e.owner!==hash(cap)||e.expires<=this.now()||e.discarded)return;
  if(e.proposal)return e.proposal;
  if(!candidate)return;
  const c=candidate as ProposalCandidate;
  if(Object.keys(c).some(k=>!['operation','targetLineId','line'].includes(k))||!['add','update','remove'].includes(c.operation))throw invalid();
  const lines=structuredClone(e.base.lines);
  if(c.operation!=='add'&&!lines.some(l=>l.lineId===c.targetLineId))throw invalid();
  const before=c.operation==='add'?undefined:lines.find(l=>l.lineId===c.targetLineId);
  if(c.operation==='remove'){
   if(c.line!==null)throw invalid();lines.splice(lines.findIndex(l=>l.lineId===c.targetLineId),1);
  }else{
   if(c.operation==='add'&&c.targetLineId!==null)throw invalid();
   const line=cartLine(c.line);if(!menu.availableIds.includes(line.flavorId))throw invalid();
   if(c.operation==='update')lines.splice(lines.findIndex(l=>l.lineId===c.targetLineId),1,{...line,lineId:c.targetLineId!});
   else lines.push({...line,lineId:randomUUID()});
  }
  // Merge only identical configurations, with the same per-line maximum as direct ordering.
  const merged:typeof lines=[];
  for(const line of lines){const existing=merged.find(l=>identity(plain(l))===identity(plain(line)));if(existing){if(existing.quantity+line.quantity>10)throw invalid();existing.quantity+=line.quantity;}else merged.push(line);}
  if(merged.length>10||merged.some(l=>!menu.availableIds.includes(l.flavorId)))throw invalid();
  const quote=merged.length?calculate(merged.map(plain),e.base.fulfillment):{lines:[],subtotal:0,deliveryFee:0,total:0};
  // Descriptions are canonical, localized by the API; clients never render model-supplied labels.
  const describe=(line:CartLine)=>{
   const f=flavors.find(f=>f.id===line.flavorId)!;const pt=e.locale==='pt-BR';
   return `${line.quantity} × ${f.name} · ${sizes.find(s=>s.id===line.sizeId)!.label[e.locale]} · ${line.crustId==='traditional'?(pt?'Tradicional':'Traditional'):line.crustId==='thin'?(pt?'Fina':'Thin'):(pt?'Recheada com Catupiry':'Catupiry stuffed')} · ${pt?'Sem':'Without'}: ${line.removedIngredientIds.map(id=>f.ingredients.find(i=>i[0]===id)?.[pt?1:2]).join(', ')||'—'} · ${pt?'Adicionais':'Extras'}: ${line.extraToppingIds.map(id=>extras.find(x=>x.id===id)!.label[e.locale]).join(', ')||'—'}`;
  };
  const affected=c.operation==='remove'?before!:cartLine(c.line);
  e.menu=menu.signature;e.expires=this.now()+300000;
  e.proposal={candidate:{operation:c.operation,targetLineId:c.targetLineId,line:c.operation==='remove'?null:cartLine(c.line)},id:randomUUID(),requestId,operation:c.operation,targetLineId:c.targetLineId,baseFingerprint:hash(e.base),baseRevision:e.base.revision,expiresAt:new Date(e.expires).toISOString(),fulfillment:e.base.fulfillment,summary:describe(affected),...(before?{beforeSummary:describe(before)}:{}),lines:merged,quote};
  return e.proposal;
 }
 confirm(id:string,cap:string,current:CartSnapshot,menu:ProposalMenu):CartProposal{
  const e=[...this.entries.values()].find(e=>e.proposal?.id===id);
  if(!e||e.owner!==hash(cap)||e.discarded||e.expires<=this.now())throw new Error('proposal_expired');
  if(hash(current)!==hash(e.base))throw new Error('proposal_stale');
  if(e.menu!==menu.signature||e.proposal!.lines.some(l=>!menu.availableIds.includes(l.flavorId)))throw new Error('proposal_stale');
  return e.proposal!;
 }
 discard(id:string,cap:string){const e=[...this.entries.values()].find(e=>e.proposal?.id===id);if(e&&e.owner===hash(cap))e.discarded=true;}
}
