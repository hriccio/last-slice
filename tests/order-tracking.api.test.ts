import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer, type Server} from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as pause} from 'node:timers/promises';

const line = {flavorId:'mussarela', sizeId:'media', crustId:'traditional', removedIngredientIds:[], extraToppingIds:[], quantity:1};
const expectedFields = ['orderCode','createdAt','updatedAt','status','statusKey','fulfillment','lines','subtotal','deliveryFee','total','demoOnly'].sort();
const expectedLineFields = [...Object.keys(line), 'unitPrice', 'lineTotal'].sort();
const token = 'spec-007-local-test';

async function listen(server:Server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return (server.address() as {port:number}).port;
}

async function startApi(t:any, supabaseUrl = '') {
  const reservation = createServer();
  const port = await listen(reservation);
  await new Promise<void>(resolve => reservation.close(() => resolve()));
  const child = spawn(process.execPath, ['--import', 'tsx', 'apps/api/src/index.ts'], {
    env:{...process.env, PORT:String(port), KITCHEN_BOARD_TOKEN:token, SUPABASE_URL:supabaseUrl, SUPABASE_SERVICE_ROLE_KEY:supabaseUrl ? 'fixture-only-key' : ''},
    stdio:['ignore','pipe','pipe'],
  });
  let output = '';
  child.stdout.on('data', data => output += data);
  child.stderr.on('data', data => output += data);
  t.after(async () => {
    if (child.exitCode === null) {
      const exited = once(child, 'exit');
      child.kill();
      await exited;
    }
  });
  const origin = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 200; attempt++) {
    if (output.includes('API listening')) return origin;
    if (child.exitCode !== null) throw new Error(output);
    await pause(25);
  }
  throw new Error(`API did not start: ${output}`);
}

function assertPrivate(order:any) {
  assert.deepEqual(Object.keys(order).sort(), expectedFields);
  assert.equal(order.demoOnly, true);
  assert.equal(new Date(order.updatedAt).toISOString(), order.updatedAt);
  for (const line of order.lines) assert.deepEqual(Object.keys(line).sort(), expectedLineFields);
  assert.doesNotMatch(JSON.stringify(order), /PRIVATE_/);
}

test('memory lookup keeps timestamps, kitchen statuses and the exact privacy boundary', async t => {
  const origin = await startApi(t);
  for (const fulfillment of ['pickup', 'delivery']) {
    const created = await fetch(`${origin}/orders`, {
      method:'POST', headers:{'content-type':'application/json'},
      body:JSON.stringify({
        idempotencyKey:`PRIVATE_KEY_${fulfillment}`, locale:'pt-BR', fulfillment,
        customer:{name:'PRIVATE_NAME', phone:'11999999999'},
        address:{street:'PRIVATE_STREET', number:'7', neighborhood:'PRIVATE_NEIGHBORHOOD', city:'PRIVATE_CITY', state:'SP', complement:'PRIVATE_COMPLEMENT', reference:'PRIVATE_REFERENCE'},
        lines:[{...line, customer:{name:'PRIVATE_NESTED_NAME'}, payment:'PRIVATE_PAYMENT'}],
      }),
    });
    assert.equal(created.status, 201);
    const initial = await created.json() as any;
    let response = await fetch(`${origin}/orders/${initial.orderCode}`);
    let current = await response.json() as any;
    assertPrivate(current);
    assert.equal(current.status, 'received');
    assert.equal(current.updatedAt, current.createdAt);
    assert.match(response.headers.get('cache-control') || '', /no-store/);

    const steps = ['confirmed', 'preparing', fulfillment === 'pickup' ? 'ready_for_pickup' : 'out_for_delivery', 'completed'];
    for (const status of steps) {
      const before = current;
      const update = await fetch(`${origin}/kitchen/orders/${initial.orderCode}/status`, {
        method:'PATCH', headers:{'content-type':'application/json', authorization:`Bearer ${token}`},
        body:JSON.stringify({expectedStatus:before.status, status}),
      });
      assert.equal(update.status, 200);
      response = await fetch(`${origin}/orders/${initial.orderCode}`);
      current = await response.json();
      assertPrivate(current);
      assert.equal(current.status, status);
      assert.equal(current.statusKey, `status.${status}`);
      assert.ok(Date.parse(current.updatedAt) >= Date.parse(before.updatedAt));
      assert.equal(current.total, before.total);
    }
  }
  const missing = await fetch(`${origin}/orders/LS-MISSING`);
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), {error:{code:'order_not_found', messageKey:'errors.order_not_found'}});
});

test('Supabase lookup uses canonical persisted status/time and strips raw stored fields', async t => {
  const code = 'LS-0123456789ABCD';
  const createdAt = '2026-10-24T10:00:00.000Z';
  const updatedAt = '2026-10-24T11:00:00.000Z';
  let row:any = {
    status:'preparing', created_at:createdAt, updated_at:updatedAt,
    order_data:{orderCode:code, createdAt:'2020-01-01T00:00:00.000Z', updatedAt:'2020-01-01T00:00:00.000Z', status:'received', statusKey:'status.received', fulfillment:'delivery',
      lines:[{...line, unitPrice:4600, lineTotal:4600, phone:'PRIVATE_PHONE'}], subtotal:4600, deliveryFee:800, total:5400,
      customer:{name:'PRIVATE_NAME'}, address:{street:'PRIVATE_STREET'}, payment:'PRIVATE_PAYMENT', idempotencyKey:'PRIVATE_KEY', payload:'PRIVATE_PAYLOAD'},
  };
  const fixture = createServer((req, res) => {
    const url = new URL(req.url!, 'http://localhost');
    assert.equal(url.pathname, '/rest/v1/demo_orders');
    assert.equal(url.searchParams.get('select'), 'order_data,status,created_at,updated_at');
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(url.searchParams.get('order_code') === `eq.${code}` ? [row] : []));
  });
  const fixturePort = await listen(fixture);
  t.after(() => new Promise<void>(resolve => fixture.close(() => resolve())));
  const origin = await startApi(t, `http://127.0.0.1:${fixturePort}`);
  const lookup = async () => (await fetch(`${origin}/orders/${code}`)).json() as Promise<any>;
  const current = await lookup();
  assertPrivate(current);
  assert.equal(current.status, 'preparing');
  assert.equal(current.statusKey, 'status.preparing');
  assert.equal(current.updatedAt, updatedAt);
  assert.equal(current.createdAt, createdAt);
  row = {...row, status:'received', updated_at:null};
  assert.equal((await lookup()).updatedAt, createdAt);
  const missing = await fetch(`${origin}/orders/LS-MISSING`);
  assert.equal(missing.status, 404);
  assert.equal((await missing.json() as any).error.code, 'order_not_found');
});
