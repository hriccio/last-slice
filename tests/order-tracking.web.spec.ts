import {test, expect, type Page} from '@playwright/test';
import {flavors, sizes, extras, crustSurcharge, deliveryFee, calculate} from '../packages/contracts/src/index';

test.afterEach(async ({page}) => {await page.unrouteAll({behavior:'ignoreErrors'});});

const line = {flavorId:'mussarela', sizeId:'media', crustId:'traditional', removedIngredientIds:[], extraToppingIds:[], quantity:1} as const;
const order = {
  orderCode:'LS-123456789ABCDE', createdAt:'2026-10-24T12:00:00.000Z', updatedAt:'2026-10-24T12:00:00.000Z',
  status:'received', statusKey:'status.received', fulfillment:'pickup', demoOnly:true,
  ...calculate([{...line, removedIngredientIds:[], extraToppingIds:[]}], 'pickup'),
};
const text = {
  'en-US':{track:'Track an order', code:'Order code', find:'Look up order', refresh:'Refresh status', received:'Received', confirmed:'Confirmed', last:'Last checked', stale:'Could not refresh. Showing the last status we loaded.', current:'Current status', preceding:'Earlier step', upcoming:'Upcoming step'},
  'pt-BR':{track:'Acompanhar pedido', code:'Código do pedido', find:'Buscar pedido', refresh:'Atualizar status', received:'Recebido', confirmed:'Confirmado', last:'Última consulta', stale:'Não foi possível atualizar. Exibindo o último status carregado.', current:'Status atual', preceding:'Etapa anterior', upcoming:'Próxima etapa'},
};

async function setup(page:Page, locale:keyof typeof text = 'en-US') {
  let current = {...order};
  let fail = false;
  let missing = false;
  let release:(() => void)|undefined;
  let delay = false;
  const checks:number[] = [];
  await page.clock.install({time:new Date('2026-10-24T12:00:00Z')});
  await page.clock.pauseAt(new Date('2026-10-24T12:00:01Z'));
  await page.addInitScript(locale => {
    localStorage.setItem('locale', locale);
    let visibility = 'visible';
    Object.defineProperty(document, 'visibilityState', {get:() => visibility});
    (window as any).setVisibility = (value:string) => {
      visibility = value;
      document.dispatchEvent(new Event('visibilitychange'));
    };
  }, locale);
  await page.route('http://127.0.0.1:34117/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/menu') {
      return route.fulfill({json:{publicDemo:false,flavors, sizes, extras, crusts:[{id:'traditional', surcharge:0},{id:'stuffed', surcharge:crustSurcharge}], deliveryFee}});
    }
    if (path === '/orders' && route.request().method() === 'POST') return route.fulfill({status:201, json:order});
    checks.push(await page.evaluate(() => Date.now()));
    if (delay) await new Promise<void>(resolve => release = resolve);
    if (fail) return route.fulfill({status:503, json:{error:{code:'order_lookup_failed'}}});
    if (missing) return route.fulfill({status:404, json:{error:{code:'order_not_found'}}});
    return route.fulfill({json:current});
  });
  await page.goto('/');
  return {
    checks,
    set:(changes:Partial<typeof order>) => current = {...current, ...changes},
    fail:(value:boolean) => fail = value,
    missing:(value:boolean) => missing = value,
    delay:(value:boolean) => {delay = value; if (!value) release?.();},
    hidden:async (value:boolean) => page.evaluate(value => (window as any).setVisibility(value ? 'hidden' : 'visible'), value),
  };
}

async function lookup(page:Page, locale:keyof typeof text = 'en-US') {
  const t = text[locale];
  await page.getByRole('banner').getByRole('button', {name:t.track, exact:true}).click();
  await page.getByRole('textbox', {name:t.code}).fill(order.orderCode.toLowerCase());
  await page.getByRole('button', {name:t.find, exact:true}).click();
  await expect(page.locator('.trackingCurrent')).toHaveText(t.received);
  await expect(page.getByRole('button', {name:t.refresh, exact:true})).toBeEnabled();
}

for (const locale of ['pt-BR', 'en-US'] as const) {
  test(`lookup, polling, retry, keyboard and lifecycle (${locale})`, async ({page}) => {
    const server = await setup(page, locale), t = text[locale];
    await lookup(page, locale);
    await expect(page.getByRole('listitem').filter({hasText:t.upcoming})).toHaveCount(4);
    await expect(page.locator('[aria-current="step"]')).toContainText(t.received);
    await page.clock.runFor(14999);
    expect(server.checks).toHaveLength(1);
    server.set({status:'confirmed'});
    await page.clock.runFor(1);
    await expect(page.locator('.trackingCurrent')).toHaveText(t.confirmed);
    expect(server.checks[1] - server.checks[0]).toBeGreaterThanOrEqual(15000);
    await expect(page.getByRole('listitem').filter({hasText:t.preceding})).toHaveCount(1);
    await expect(page.getByRole('status')).toContainText(t.last);

    server.fail(true);
    await page.getByRole('button', {name:t.refresh, exact:true}).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('alert')).toHaveText(t.stale);
    await expect(page.getByRole('button', {name:t.refresh, exact:true})).toBeFocused();
    await expect(page.locator('.trackingCurrent')).toHaveText(t.confirmed);
    await expect(page.getByRole('textbox', {name:t.code})).toHaveValue(order.orderCode.toLowerCase());
    server.fail(false);
    await page.getByRole('button', {name:t.refresh, exact:true}).click();
    await expect(page.getByRole('alert')).toHaveCount(0);

    await server.hidden(true);
    const count = server.checks.length;
    await page.clock.runFor(60000);
    expect(server.checks).toHaveLength(count);
    server.set({status:'preparing'});
    await server.hidden(false);
    await expect(page.locator('[aria-current="step"]')).toContainText(locale === 'pt-BR' ? 'Em preparo' : 'Preparing');
    expect(server.checks).toHaveLength(count + 1);

    await page.locator('.brand').click();
    const beforeLeaving = server.checks.length;
    await page.clock.runFor(60000);
    expect(server.checks).toHaveLength(beforeLeaving);
    server.set({status:'ready_for_pickup'});
    await page.getByRole('banner').getByRole('button', {name:t.track, exact:true}).click();
    await expect(page.locator('.trackingCurrent')).toHaveText(locale === 'pt-BR' ? 'Pronto para retirada' : 'Ready for pickup');
    expect(server.checks).toHaveLength(beforeLeaving + 1);
  });
}

test('slow requests do not overlap and manual refresh resets polling', async ({page}) => {
  const server = await setup(page);
  await lookup(page);
  server.delay(true);
  await page.clock.runFor(15000);
  await expect.poll(() => server.checks.length).toBe(2);
  await expect(page.getByRole('button', {name:'Refreshing…', exact:true}).last()).toHaveAttribute('aria-busy', 'true');
  await page.clock.runFor(60000);
  expect(server.checks).toHaveLength(2);
  server.delay(false);
  await expect(page.getByRole('button', {name:'Refresh status', exact:true})).toBeEnabled();
  await page.clock.runFor(14000);
  await page.getByRole('button', {name:'Refresh status', exact:true}).click();
  await expect.poll(() => server.checks.length).toBe(3);
  await expect(page.getByRole('button', {name:'Refresh status', exact:true})).toBeEnabled();
  await page.clock.runFor(14999);
  expect(server.checks).toHaveLength(3);
});

test('both branches, terminal statuses and unknown status recovery', async ({page}) => {
  const server = await setup(page);
  await lookup(page);
  await expect(page.getByRole('listitem').filter({hasText:'Ready for pickup'})).toHaveCount(1);
  await expect(page.getByRole('listitem').filter({hasText:'Out for delivery'})).toHaveCount(0);
  server.set({fulfillment:'delivery', status:'out_for_delivery'});
  await page.getByRole('button', {name:'Refresh status', exact:true}).click();
  await expect(page.locator('[aria-current="step"]')).toContainText('Out for delivery');
  await expect(page.getByRole('listitem').filter({hasText:'Ready for pickup'})).toHaveCount(0);
  for (const status of ['completed', 'cancelled']) {
    server.set({status});
    await page.getByRole('button', {name:'Refresh status', exact:true}).click();
    await expect(page.locator('.trackingCurrent')).toHaveText(status === 'completed' ? 'Completed' : 'Cancelled');
    const count = server.checks.length;
    await page.clock.runFor(60000);
    expect(server.checks).toHaveLength(count);
    await expect(page.getByRole('button', {name:'Refresh status', exact:true})).toBeEnabled();
  }
  await expect(page.locator('.trackingTimeline')).toHaveCount(0);
  await expect(page.getByText('Demo order cancelled;', {exact:false})).toBeVisible();
  server.set({status:'future_status'});
  await page.getByRole('button', {name:'Refresh status', exact:true}).click();
  await expect(page.locator('.trackingCurrent')).toHaveText('Unknown status. Try refreshing again.');
  await expect(page.getByRole('textbox', {name:'Order code'})).toHaveValue(order.orderCode.toLowerCase());
  await expect(page.locator('[aria-current="step"]')).toHaveCount(0);
});

test('invalid code, stale response, and a lookup failure retain the entered code', async ({page}) => {
  const server = await setup(page);
  server.missing(true);
  await page.getByRole('banner').getByRole('button', {name:'Track an order', exact:true}).click();
  const input = page.getByRole('textbox', {name:'Order code'});
  await input.fill('LS-MISSING');
  await page.getByRole('button', {name:'Look up order', exact:true}).click();
  await expect(page.getByRole('alert')).toHaveText('Order not found. Check your code and try again.');
  await expect(input).toHaveValue('LS-MISSING');
  server.missing(false);
  server.fail(true);
  await page.getByRole('button', {name:'Look up order', exact:true}).click();
  await expect(page.getByRole('alert')).toHaveText('Could not look up the order. Check your connection and try again.');
  server.fail(false);
  server.delay(true);
  await page.getByRole('button', {name:'Look up order', exact:true}).click();
  await expect.poll(() => server.checks.length).toBe(3);
  await input.fill('LS-ANOTHER');
  server.delay(false);
  await expect(page.locator('.trackingCard')).toHaveCount(0);
  await expect(input).toHaveValue('LS-ANOTHER');
});

for (const locale of ['pt-BR', 'en-US'] as const) {
  test(`confirmation preview, failure retry, terminal refresh and handoff (${locale})`, async ({page}) => {
    const server = await setup(page, locale), t = text[locale];
    await page.locator('.pizzaCard').first().click();
    await page.locator('.customModal .primary').click();
    await page.locator('.bagButton').click();
    await page.getByRole('textbox', {name:locale === 'pt-BR' ? 'Seu nome' : 'Your name', exact:true}).fill('Demo Customer');
    await page.getByRole('textbox', {name:locale === 'pt-BR' ? 'Celular com DDD' : 'Phone with area code', exact:true}).fill('11999999999');
    await page.getByRole('button', {name:locale === 'pt-BR' ? 'Confirmar pedido demonstrativo' : 'Place demo order', exact:true}).click();
    await expect(page.locator('.trackingCurrent')).toHaveText(t.received);
    await expect(page.getByRole('button', {name:t.refresh, exact:true})).toBeEnabled();
    server.set({status:'confirmed'});
    await page.clock.runFor(15000);
    await expect(page.locator('.trackingCurrent')).toHaveText(t.confirmed);
    server.fail(true);
    await page.getByRole('button', {name:t.refresh, exact:true}).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status').filter({hasText:t.stale})).toBeVisible();
    await expect(page.getByRole('button', {name:t.refresh, exact:true})).toBeFocused();
    await expect(page.locator('.trackingCurrent')).toHaveText(t.confirmed);
    server.fail(false);
    server.set({status:'completed'});
    await page.getByRole('button', {name:t.refresh, exact:true}).click();
    await expect(page.locator('.trackingCurrent')).toHaveText(locale === 'pt-BR' ? 'Concluído' : 'Completed');
    const count = server.checks.length;
    await page.clock.runFor(60000);
    expect(server.checks).toHaveLength(count);
    await page.getByRole('button', {name:t.refresh, exact:true}).click();
    await expect.poll(() => server.checks.length).toBe(count + 1);
    await page.locator('main').getByRole('button', {name:t.track, exact:true}).click();
    await expect(page.getByRole('textbox', {name:t.code})).toHaveValue(order.orderCode);
    await expect(page.locator('.trackingCard')).toContainText(order.orderCode);
  });
}

test('tracking remains reachable and fits at narrow widths and larger text', async ({page}) => {
  await page.setViewportSize({width:320, height:700});
  await setup(page);
  await lookup(page);
  await page.addStyleTag({content:'.trackingCard,.trackingCard *,.trackingActions * {font-size:20px !important}'});
  const current = page.locator('[aria-current="step"]');
  await expect(current).toContainText('Current status');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
});
