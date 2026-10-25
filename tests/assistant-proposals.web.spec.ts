import {test,expect} from '@playwright/test';
for(const locale of ['pt-BR','en-US']){
 test(`reviewed proposal applies once and continues to explicit checkout (${locale})`,async({page})=>{
  const pt=locale==='pt-BR';let messages=0,confirms=0,orders=0,proposal:any;
  await page.addInitScript(locale=>{localStorage.clear();localStorage.setItem('locale',locale)},locale);
  await page.route('http://127.0.0.1:34117/**',async route=>{
   const req=route.request(),url=req.url();
   if(url.includes('/menu'))return route.fulfill({json:{publicDemo:true,flavors:[]}});
   if(url.includes('/assistant/proposals/')&&req.method()==='POST'){
    confirms++;return route.fulfill({json:{proposal}});
   }
   if(url.includes('/assistant/messages')){
    messages++;const input=req.postDataJSON();
    const line={lineId:'proposal-line-1',flavorId:'calabresa',sizeId:'grande',crustId:'traditional',removedIngredientIds:['onion'],extraToppingIds:['bacon'],quantity:1};
    proposal={id:'11111111-1111-4111-8111-111111111111',requestId:input.requestId,operation:'add',targetLineId:null,baseFingerprint:'fixture',baseRevision:input.context.cartSnapshot.revision,expiresAt:new Date(Date.now()+300000).toISOString(),summary:pt?'1 × Calabresa · Grande · Tradicional · Sem: Cebola · Adicionais: Bacon':'1 × Calabresa · Large · Traditional · Without: Onion · Extras: Bacon',fulfillment:'pickup',lines:[line],quote:{lines:[],subtotal:6900,deliveryFee:0,total:6900}};
    return route.fulfill({json:{reply:pt?'Confira a proposta.':'Review the proposal.',proposal,mode:'provider'}});
   }
   if(url.includes('/orders'))orders++;
   return route.fulfill({json:{}});
  });
  await page.goto('/');await page.getByRole('button',{name:pt?'Perguntar à pizzaria':'Ask the pizzeria'}).click();
  await page.getByRole('textbox').fill('Calabresa grande sem cebola com bacon');await page.getByRole('button',{name:pt?'Enviar mensagem':'Send message'}).click();
  const apply=page.getByRole('button',{name:pt?'Aplicar à sacola':'Apply to cart'});await expect(apply).toBeVisible();expect(confirms).toBe(0);expect(orders).toBe(0);
  await page.setViewportSize({width:390,height:844});
  const box=await page.locator('.assistantProposal').boundingBox();expect(box!.width).toBeLessThan(390);
  await apply.focus();await expect(apply).toBeFocused();await apply.press('Enter');await expect(page.getByRole('status').filter({hasText:pt?'Sacola atualizada':'Cart updated'})).toBeVisible();
  expect(confirms).toBe(1);expect(messages).toBe(1);expect(orders).toBe(0);
  await page.getByRole('button',{name:pt?'Revisar pedido demonstrativo':'Review demo order'}).click();
  await expect(page.getByRole('heading',{name:/Calabresa/})).toBeVisible();
  await expect(page.getByRole('button',{name:pt?'Confirmar pedido demonstrativo':'Place demo order'})).toBeVisible();
  expect(orders).toBe(0);
 });
}
test('adjustment carries the unapplied draft; cart edits invalidate the proposal',async({page})=>{
 let sends=0,confirms=0;
 await page.addInitScript(()=>{localStorage.clear();localStorage.setItem('locale','en-US')});
 await page.route('http://127.0.0.1:34117/**',async route=>{
  const req=route.request();
  if(req.url().includes('/menu'))return route.fulfill({json:{publicDemo:true,flavors:[]}});
  if(req.url().includes('/assistant/messages')){
   sends++;const input=req.postDataJSON();if(sends===2)expect(input.context.draftProposal.line.flavorId).toBe('calabresa');
   const line={flavorId:'calabresa',sizeId:'grande',crustId:sends===1?'traditional':'thin',removedIngredientIds:[],extraToppingIds:[],quantity:1};
   const candidate={operation:'add',targetLineId:null,line};
   return route.fulfill({json:{reply:'Review the proposed pizza.',mode:'provider',proposal:{candidate,id:'11111111-1111-4111-8111-111111111111',baseRevision:input.context.cartSnapshot.revision,expiresAt:new Date(Date.now()+300000).toISOString(),operation:'add',summary:'Calabresa · Large · '+line.crustId,fulfillment:'pickup',lines:[{...line,lineId:'draft-line'}],quote:{total:6400}}}});
  }
  if(req.url().includes('/confirm'))confirms++;
  return route.fulfill({json:{}});
 });
 await page.goto('/');await page.locator('.pizzaCard').first().click();await page.locator('.customModal .primary').click();await page.getByRole('button',{name:'Ask the pizzeria'}).click();
 await page.getByRole('textbox').fill('Calabresa large');await page.getByRole('button',{name:'Send message'}).click();
 await page.getByRole('button',{name:'Adjust',exact:true}).click();
 await page.getByRole('textbox').fill('make that thin crust');await page.getByRole('button',{name:'Send message'}).click();
 await expect(page.locator('.assistantProposal')).toContainText('thin');
 await page.getByRole('button',{name:'1',exact:true}).click();await page.getByRole('button',{name:'Delivery',exact:true}).click();
 await expect(page.getByRole('button',{name:'Apply to cart'})).toBeDisabled();expect(confirms).toBe(0);
});
