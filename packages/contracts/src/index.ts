export const locales = ['pt-BR', 'en-US'] as const;
export type Locale = typeof locales[number];
export type SizeId = 'broto' | 'media' | 'grande';
export type CrustId = 'traditional' | 'thin' | 'stuffed';
export type Fulfillment = 'pickup' | 'delivery';
export type Status = 'received' | 'confirmed' | 'preparing' | 'ready_for_pickup' | 'out_for_delivery' | 'completed' | 'cancelled';
export const sizes = [
  {id:'broto', diameterCm:25, slices:4, label:{'pt-BR':'Broto','en-US':'Small'}},
  {id:'media', diameterCm:30, slices:6, label:{'pt-BR':'Média','en-US':'Medium'}},
  {id:'grande', diameterCm:35, slices:8, label:{'pt-BR':'Grande','en-US':'Large'}}
] as const;
export const flavors = [
  {id:'mussarela', name:'Mussarela', prices:{broto:3200,media:4600,grande:5900}, ingredients:[['mozzarella','Muçarela','Mozzarella'],['tomato_sauce','Molho de tomate','Tomato sauce'],['oregano','Orégano','Oregano']], descriptions:{'pt-BR':'Muçarela derretida, molho de tomate e orégano.','en-US':'Melted mozzarella, tomato sauce, and oregano.'}},
  {id:'calabresa', name:'Calabresa', prices:{broto:3500,media:4900,grande:6400}, ingredients:[['calabresa','Calabresa','Calabresa sausage'],['mozzarella','Muçarela','Mozzarella'],['onion','Cebola','Onion'],['oregano','Orégano','Oregano']], descriptions:{'pt-BR':'Calabresa fatiada, muçarela, cebola e orégano.','en-US':'Sliced calabresa sausage, mozzarella, onion, and oregano.'}},
  {id:'portuguesa', name:'Portuguesa', prices:{broto:3800,media:5300,grande:6900}, ingredients:[['ham','Presunto','Ham'],['mozzarella','Muçarela','Mozzarella'],['egg','Ovo','Egg'],['onion','Cebola','Onion'],['peas','Ervilha','Peas'],['olives','Azeitonas','Olives']], descriptions:{'pt-BR':'Presunto, muçarela, ovo, cebola, ervilha e azeitonas.','en-US':'Ham, mozzarella, egg, onion, peas, and olives.'}},
  {id:'frango_catupiry', name:'Frango com Catupiry', prices:{broto:3800,media:5300,grande:6900}, ingredients:[['chicken','Frango desfiado','Shredded chicken'],['catupiry','Catupiry','Catupiry-style cream cheese'],['mozzarella','Muçarela','Mozzarella']], descriptions:{'pt-BR':'Frango desfiado, Catupiry e muçarela.','en-US':'Shredded chicken, Catupiry-style cream cheese, and mozzarella.'}},
  {id:'quatro_queijos', name:'Quatro Queijos', prices:{broto:4000,media:5600,grande:7300}, ingredients:[['mozzarella','Muçarela','Mozzarella'],['provolone','Provolone','Provolone'],['parmesan','Parmesão','Parmesan'],['gorgonzola','Gorgonzola','Gorgonzola']], descriptions:{'pt-BR':'Muçarela, provolone, parmesão e gorgonzola.','en-US':'Mozzarella, provolone, parmesan, and gorgonzola.'}}
] as const;
export const extras = [
  {id:'extra_mozzarella',label:{'pt-BR':'Muçarela','en-US':'Mozzarella'}},{id:'extra_calabresa',label:{'pt-BR':'Calabresa','en-US':'Calabresa'}},{id:'bacon',label:{'pt-BR':'Bacon','en-US':'Bacon'}},{id:'extra_onion',label:{'pt-BR':'Cebola','en-US':'Onion'}},{id:'extra_olives',label:{'pt-BR':'Azeitonas','en-US':'Olives'}},{id:'extra_catupiry',label:{'pt-BR':'Catupiry','en-US':'Catupiry-style cream cheese'}}
] as const;
export const crustSurcharge: Record<SizeId,number> = {broto:600,media:800,grande:1000};
export const deliveryFee = 800;
export interface CartLine {flavorId:string;sizeId:SizeId;crustId:CrustId;removedIngredientIds:string[];extraToppingIds:string[];quantity:number}
export interface OrderRequest {idempotencyKey:string;locale:Locale;fulfillment:Fulfillment;customer:{name:string;phone:string};address?:{street:string;number:string;neighborhood:string;city:string;state:string;complement?:string;reference?:string};lines:CartLine[]}
export interface PricedLine extends CartLine {unitPrice:number;lineTotal:number}
export interface OrderTrackingResponse {
  orderCode:string;
  createdAt:string;
  updatedAt:string;
  status:Status;
  statusKey:string;
  fulfillment:Fulfillment;
  lines:PricedLine[];
  subtotal:number;
  deliveryFee:number;
  total:number;
  demoOnly:true;
}
export function calculate(lines:CartLine[], fulfillment:Fulfillment) {
  const priced:PricedLine[] = lines.map(line => {
    const flavor = flavors.find(f=>f.id===line.flavorId); if(!flavor) throw new Error('unknown_flavor');
    if(!sizes.some(s=>s.id===line.sizeId)) throw new Error('invalid_size');
    if(!['traditional','thin','stuffed'].includes(line.crustId)) throw new Error('invalid_crust');
    if(!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>10) throw new Error('invalid_quantity');
    const ingredients = flavor.ingredients.map(i=>i[0]);
    if(new Set(line.removedIngredientIds).size!==line.removedIngredientIds.length || line.removedIngredientIds.some(i=>!ingredients.includes(i as never))) throw new Error('invalid_removed_ingredient');
    if(line.extraToppingIds.length>3||new Set(line.extraToppingIds).size!==line.extraToppingIds.length||line.extraToppingIds.some(i=>!extras.some(e=>e.id===i))) throw new Error('invalid_extras');
    const base = flavor.prices[line.sizeId]; const unitPrice = base+(line.crustId==='stuffed'?crustSurcharge[line.sizeId]:0)+500*line.extraToppingIds.length;
    return {...line,unitPrice,lineTotal:unitPrice*line.quantity};
  });
  if(!priced.length) throw new Error('empty_cart');
  const subtotal=priced.reduce((sum,line)=>sum+line.lineTotal,0), fee=fulfillment==='delivery'?deliveryFee:0;
  return {lines:priced,subtotal,deliveryFee:fee,total:subtotal+fee};
}
export function isLocale(value:unknown): value is Locale {return typeof value==='string'&&(locales as readonly string[]).includes(value)}

export type AssistantState = 'queued'|'running'|'completed'|'cancelled'|'expired'|'failed';
export interface AssistantTicket {
  requestId:string; state:AssistantState; pollAfterSeconds:number;
  position?:number; estimatedWaitSeconds?:number; estimatedReplySeconds?:number;
  recentAverageReplySeconds?:number; estimateUpdatedAt?:string;
  reply?:string; disclaimer?:true; mode?:'provider'|'development_fake';
  error?:string; resetsAt?:string;
}
export interface AssistantTurn {role:'user'|'assistant';content:string}
export interface AssistantContext {
  screen:'menu'|'customization'|'cart'|'checkout'; selection?:CartLine;
  cartLines?:CartLine[]; fulfillment?:Fulfillment;
}
