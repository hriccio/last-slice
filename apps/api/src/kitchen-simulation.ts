import {randomUUID} from 'node:crypto';
import type {StaffEvent,Status,StaffRole} from '@last-slice/contracts';
export const nextOrderStatus=(status:Status,fulfillment:'pickup'|'delivery'):Status|null=>status==='received'?'confirmed':status==='confirmed'?'preparing':status==='preparing'?(fulfillment==='pickup'?'ready_for_pickup':'out_for_delivery'):['ready_for_pickup','out_for_delivery'].includes(status)?'completed':null;
export function stageDelay(status:Status,random:()=>number=Math.random){
 const range=status==='received'||status==='confirmed'?[5,15]:status==='preparing'?[30,90]:status==='ready_for_pickup'?[15,45]:status==='out_for_delivery'?[30,60]:[0,0];
 return (range[0]+Math.floor(Math.max(0,Math.min(1,random()))*(range[1]-range[0])))*1000;
}
export interface SimulationOrder {orderCode:string;createdAt:string;updatedAt?:string;status:Status;statusKey:string;fulfillment:'pickup'|'delivery';lines:{flavorId:string}[];publicDemo?:boolean;nextTransitionAt?:number;expiresAt?:number}
export class MemoryKitchen {
 events:StaffEvent[]=[];
 private sales=new Map<string,{day:string;quantity:number}[]>();
 constructor(private orders:Map<string,any>,private now:()=>number=Date.now,private random:()=>number=Math.random){}
 weeklySales(){const midnight=Date.UTC(new Date(this.now()).getUTCFullYear(),new Date(this.now()).getUTCMonth(),new Date(this.now()).getUTCDate());const since=midnight-6*86400000;const totals=new Map<string,number>();for(const [id,days]of this.sales)for(const row of days)if(Date.parse(`${row.day}T00:00:00.000Z`)>=since)totals.set(id,(totals.get(id)||0)+row.quantity);return [...totals].map(([flavorId,quantity])=>({flavorId,quantity}));}
 initialize(order:SimulationOrder){order.publicDemo=true;order.nextTransitionAt=this.now()+stageDelay('received',this.random);order.expiresAt=this.now()+86400000;}
 tick(){
  const now=this.now();let advanced=0;
  for(const order of this.orders.values()){
   if(!order.publicDemo||order.expiresAt<=now||order.nextTransitionAt==null||order.nextTransitionAt>now)continue;
   const next=nextOrderStatus(order.status,order.fulfillment);
   if(!next){order.nextTransitionAt=undefined;continue;}
   order.status=next;order.statusKey=`status.${next}`;order.updatedAt=new Date(now).toISOString();order.nextTransitionAt=next==='completed'?undefined:now+stageDelay(next,this.random);
   if(next==='completed'){const day=new Date(now).toISOString().slice(0,10);for(const line of order.lines){const rows=this.sales.get(line.flavorId)||[];const existing=rows.find(row=>row.day===day);if(existing)existing.quantity+=line.quantity||1;else rows.push({day,quantity:line.quantity||1});this.sales.set(line.flavorId,rows);}for(const [id,rows]of this.sales)this.sales.set(id,rows.filter(row=>Date.parse(`${row.day}T00:00:00.000Z`)>now-8*86400000));}
   const roles:StaffRole[]=next==='confirmed'?['counter','cook']:next==='preparing'?['cook','oven']:next==='ready_for_pickup'?['oven','counter']:next==='out_for_delivery'?['counter','delivery']:['counter','cook'];
   for(const speaker of roles)this.events.push({id:randomUUID(),orderCode:order.orderCode,createdAt:order.updatedAt,speaker,templateKey:next as StaffEvent['templateKey'],args:{flavorIds:[...new Set<string>(order.lines.map((l:any)=>l.flavorId))]}});
   advanced++;
  }
  this.events=this.events.slice(-200);return advanced;
 }
 cleanup(){const now=this.now();for(const [code,o]of this.orders)if(o.publicDemo&&o.expiresAt<=now)this.orders.delete(code);this.events=this.events.filter(e=>Date.parse(e.createdAt)>now-86400000&&this.orders.has(e.orderCode));}
 snapshot(status?:string,fulfillment?:string){
  const orders=[...this.orders.values()].filter(o=>o.publicDemo&&o.expiresAt>this.now()&&(!status||o.status===status)&&(!fulfillment||o.fulfillment===fulfillment));
  orders.sort((a,b)=>Number(!['completed','cancelled'].includes(b.status))-Number(!['completed','cancelled'].includes(a.status))||Date.parse(b.createdAt)-Date.parse(a.createdAt));
  return {orders:orders.slice(0,100),messages:this.events.filter(e=>this.orders.get(e.orderCode)?.expiresAt>this.now()).slice(-200),mode:'public_demo',simulation:true,persistence:'memory'};
 }
}
