import {test,expect} from '@playwright/test';
import {calculate,flavors,sizes,extras,demoCheckoutFixtures} from '../packages/contracts/src/index';
const line={flavorId:'calabresa',sizeId:'media' as const,crustId:'traditional' as const,removedIngredientIds:[],extraToppingIds:[],quantity:1};
for(const locale of ['pt-BR','en-US']){
 test(`public checkout needs no identity and shared kitchen is read only (${locale})`,async({page})=>{
  const pt=locale==='pt-BR';let posted:any;let checks=0;
  const order={orderCode:'LS-11223344556677',createdAt:'2026-10-24T12:00:00Z',updatedAt:'2026-10-24T12:00:00Z',locale,fulfillment:'pickup',status:'preparing',demoOnly:true,...calculate([line],'pickup')};
  await page.addInitScript(locale=>localStorage.setItem('locale',locale),locale);
  await page.route('http://127.0.0.1:34117/**',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname==='/menu')return route.fulfill({json:{publicDemo:true,checkoutFixtures:demoCheckoutFixtures,flavors,sizes,extras,deliveryFee:800}});
   if(url.pathname==='/config')return route.fulfill({json:{publicDemo:true}});
   if(url.pathname==='/orders'&&route.request().method()==='POST'){posted=route.request().postDataJSON();return route.fulfill({status:201,json:order});}
   if(url.pathname.startsWith('/orders/'))return route.fulfill({json:order});
   if(url.pathname==='/kitchen/orders'){checks++;return route.fulfill({json:{orders:[order],messages:[{id:'one',createdAt:order.updatedAt,orderCode:order.orderCode,speaker:'cook',templateKey:'preparing',args:{flavorIds:['calabresa']}}],mode:'public_demo',persistence:'memory',simulation:true}});}
   return route.fulfill({json:{}});
  });
  const external:string[]=[];page.on('request',r=>{if(r.url().startsWith('https://'))external.push(r.url());});
  await page.goto('/');await page.locator('.pizzaCard').nth(1).click();await page.locator('.customModal .primary').click();await page.locator('.bagButton').click();
  await expect(page.getByRole('heading',{name:pt?'Dados fictícios da demonstração':'Fictional demo details'})).toBeVisible();
  await expect(page.locator('.checkoutForm input')).toHaveCount(0);
  await page.getByRole('button',{name:pt?'Confirmar pedido demonstrativo':'Place demo order',exact:true}).click();
  await expect(page.locator('.resultCard')).toContainText(order.orderCode);
  expect(posted.fixtureId).toBe('demo-pickup');expect(posted.customer).toBeUndefined();expect(posted.address).toBeUndefined();
  await page.goto('/kitchen');await expect(page.getByRole('heading',{name:pt?'Cozinha de demonstração':'Demo kitchen',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:pt?'Conversa da equipe simulada':'Simulated staff conversation'})).toBeVisible();
  await expect(page.locator('.publicKitchenCard')).toContainText(order.orderCode);
  await expect(page.locator('.publicStaffMessage')).toContainText('Calabresa');
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(page.getByRole('button',{name:/advance|avançar|confirm change|confirmar alteração|sign in|acessar quadro/i})).toHaveCount(0);
  await page.getByLabel(pt?'Modalidade':'Fulfillment',{exact:true}).selectOption('delivery');await expect(page.locator('.publicKitchenCard')).toHaveCount(0);
  await page.setViewportSize({width:320,height:750});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  expect(external).toEqual([]);expect(checks).toBeGreaterThan(0);
 });
}

test('public board foreground polling preserves staff scroll, stale snapshots and keyboard focus',async({page})=>{
 await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
 await page.addInitScript(()=>{
  localStorage.setItem('locale','en-US');let state='visible';Object.defineProperty(document,'visibilityState',{get:()=>state});(window as any).visibility=(next:string)=>{state=next;document.dispatchEvent(new Event('visibilitychange'));};
 });
 let count=0,fail=false;const events=Array.from({length:40},(_,i)=>({id:`event${i}`,orderCode:`LS-${i}`,createdAt:new Date(1700000000000+i*1000).toISOString(),speaker:'cook',templateKey:'preparing',args:{flavorIds:['calabresa']}}));
 await page.route('http://127.0.0.1:34117/**',async route=>{
  if(route.request().url().endsWith('/config'))return route.fulfill({json:{publicDemo:true}});
  count++;if(fail)return route.fulfill({status:503,json:{error:{code:'kitchen_unavailable'}}});
  return route.fulfill({json:{orders:[],messages:events,persistence:'memory'}});
 });
 await page.goto('/kitchen');await expect(page.locator('.publicStaffMessage')).toHaveCount(40);
 const feed=page.getByRole('log');await feed.evaluate(el=>{el.scrollTop=50;el.dispatchEvent(new Event('scroll'));});
 const original=await feed.evaluate(el=>el.scrollTop);
 events.push({...events[0],id:'new',createdAt:new Date().toISOString()});
 await page.clock.runFor(15000);await expect(page.locator('.publicStaffMessage')).toHaveCount(41);
 expect(await feed.evaluate(el=>el.scrollTop)).toBe(original);
 await page.getByRole('button',{name:'Show latest messages'}).click();expect(await feed.evaluate(el=>el.scrollTop)).toBeGreaterThan(original);
 fail=true;await page.getByRole('button',{name:'Refresh board',exact:true}).focus();await page.keyboard.press('Enter');
 await expect(page.getByRole('alert')).toContainText('Keeping the last snapshot');await expect(page.getByRole('button',{name:'Refresh board',exact:true})).toBeFocused();
 await expect(page.locator('.publicStaffMessage')).toHaveCount(41);
 await page.evaluate(()=>(window as any).visibility('hidden'));const before=count;await page.clock.runFor(60000);expect(count).toBe(before);
 fail=false;await page.evaluate(()=>(window as any).visibility('visible'));await expect.poll(()=>count).toBe(before+1);
});
