import {test,expect} from '@playwright/test';
for(const locale of ['pt-BR','en-US']){
 test(`queued chat preserves state, shows honest timing, cancels and recovers (${locale})`,async({page})=>{
  const pt=locale==='pt-BR';let polls=0,sends=0,cancels=0,state='queued';let fail='';
  await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
  await page.addInitScript(locale=>localStorage.setItem('locale',locale),locale);
  await page.route('http://127.0.0.1:34117/**',async route=>{
   const request=route.request();
   if(request.url().includes('/menu'))return route.fulfill({json:{flavors:[]}});
   if(request.url().includes('/assistant/')){
    if(request.method()==='POST'){sends++;if(fail)return route.fulfill({status:429,json:{error:{code:fail},resetsAt:'2026-10-25T00:00:00Z'}});}
    if(request.method()==='GET')polls++;
    if(request.method()==='DELETE'){cancels++;state='cancelled';}
    const id=request.method()==='POST'?request.postDataJSON().requestId:request.url().split('/').at(-1);
    return route.fulfill({status:request.method()==='POST'?202:200,json:{requestId:id,state,pollAfterSeconds:3,position:3,estimatedReplySeconds:100,...(polls>=1?{recentAverageReplySeconds:80}:{}),...(state==='completed'?{reply:pt?'Você pode escolher a massa fina nos controles.':'You can choose thin crust in the controls.',disclaimer:true,mode:'provider'}:{})}});
   }return route.fulfill({json:{}});
  });
  await page.goto('/');await page.getByRole('button',{name:pt?'Perguntar à pizzaria':'Ask the pizzeria'}).click();
  const input=page.getByRole('textbox',{name:pt?'O que você tem vontade de comer?':'What are you in the mood for?'});
  await input.fill(pt?'quero uma grande':'a large pizza please');
  const send=page.getByRole('button',{name:pt?'Enviar mensagem':'Send message'});await send.click();
  await expect(page.getByText(pt?'Aguardando disponibilidade da IA':'Waiting for AI availability',{exact:true})).toBeVisible();
  await expect(page.getByText(pt?'Estimativa inicial · Ainda sem média recente':'Initial estimate · No recent average yet')).toBeVisible();
  await expect(send).toBeDisabled();await send.click({force:true});expect(sends).toBe(1);
  await page.clock.runFor(3000);await expect.poll(()=>polls).toBe(1);
  await expect(page.getByText(new RegExp(pt?'Tempo médio recente':'Recent average'))).toBeVisible();
  await page.getByRole('button',{name:pt?'Sair da fila':'Leave queue'}).click();await expect.poll(()=>cancels).toBe(1);
  await expect(input).not.toHaveValue('');
  state='queued';await send.click();await expect.poll(()=>sends).toBe(2);await expect(input).toHaveValue('');await expect(page.getByRole('button',{name:pt?'Sair da fila':'Leave queue'})).toBeVisible();
  state='completed';await page.clock.runFor(3000);await expect(page.getByText(pt?'Você pode escolher a massa fina nos controles.':'You can choose thin crust in the controls.')).toBeVisible();
  fail='assistant_budget_exhausted';await input.fill('pizza');await send.click();await expect(page.getByRole('alert')).toContainText(pt?'limite diário':'daily AI limit');
  await expect(input).toHaveValue('pizza');
  await page.setViewportSize({width:390,height:844});
  const panel=page.locator('.assistantPanel');await expect(panel).toBeVisible();
  const panelBox=await panel.boundingBox(),cartBox=await page.locator('.mobileCart').boundingBox();
  expect(panelBox?.x).toBeGreaterThanOrEqual(0);expect((panelBox?.x??0)+(panelBox?.width??0)).toBeLessThanOrEqual(390);
  expect((panelBox?.y??0)+(panelBox?.height??0)).toBeLessThanOrEqual(cartBox?.y);
 });
}
