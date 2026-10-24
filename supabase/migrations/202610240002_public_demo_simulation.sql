alter table public.demo_orders add column if not exists public_demo boolean not null default false;
alter table public.demo_orders add column if not exists next_transition_at timestamptz;
alter table public.demo_orders add column if not exists expires_at timestamptz;
create index if not exists demo_orders_due on public.demo_orders(next_transition_at) where public_demo and next_transition_at is not null;
create index if not exists demo_orders_expiry on public.demo_orders(expires_at) where public_demo;
create table if not exists public.demo_simulation_control(id boolean primary key default true check(id),last_cleanup_at timestamptz);
insert into public.demo_simulation_control(id) values(true) on conflict do nothing;
create table if not exists public.demo_kitchen_events(
 id uuid primary key default gen_random_uuid(),sequence bigint generated always as identity unique,order_code text not null references public.demo_orders(order_code) on delete cascade,
 created_at timestamptz not null, speaker text not null check(speaker in ('counter','cook','oven','delivery')),
 template_key text not null check(template_key in ('confirmed','preparing','ready_for_pickup','out_for_delivery','completed')),
 args jsonb not null, unique(order_code,template_key,speaker)
);
create index if not exists demo_kitchen_events_recent on public.demo_kitchen_events(created_at desc);
alter table public.demo_kitchen_events enable row level security;
alter table public.demo_simulation_control enable row level security;

create or replace function public.create_public_demo_order(
 p_code text,p_key text,p_payload text,p_order jsonb,p_random double precision default null,p_now timestamptz default clock_timestamp()
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare old demo_orders%rowtype; begin
 perform 1 from demo_simulation_control where id=true for update;
 select * into old from demo_orders where idempotency_key=p_key;
 if found then
  if not old.public_demo or old.payload<>p_payload then return jsonb_build_object('error','idempotency_conflict'); end if;
  if old.expires_at<=p_now then return jsonb_build_object('error','order_not_found'); end if;
  return jsonb_build_object('order',old.order_data,'reused',true);
 end if;
 if (select count(*) from demo_orders where public_demo and created_at>p_now-interval '1 minute')>=20 or
    (select count(*) from demo_orders where public_demo and expires_at>p_now)>=2000 then
  return jsonb_build_object('error','demo_capacity_reached');
 end if;
 insert into demo_orders(order_code,idempotency_key,payload,order_data,status,created_at,updated_at,public_demo,next_transition_at,expires_at)
 values(p_code,p_key,p_payload,p_order,'received',p_now,p_now,true,p_now+make_interval(secs=>5+floor(greatest(0,least(1,coalesce(p_random,random())))*10)),p_now+interval '24 hours');
 return jsonb_build_object('order',p_order,'reused',false);
end $$;

create or replace function public.advance_demo_kitchen(p_now timestamptz default clock_timestamp(),p_random double precision default null)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare r demo_orders%rowtype; next_state text; delay_min integer; delay_max integer; due timestamptz;
 speakers text[]; role_name text; count_done integer:=0; facts jsonb;
begin
 for r in select * from demo_orders where public_demo and expires_at>p_now and next_transition_at<=p_now order by next_transition_at for update skip locked limit 50 loop
  next_state:=case r.status when 'received' then 'confirmed' when 'confirmed' then 'preparing'
   when 'preparing' then case when r.order_data->>'fulfillment'='pickup' then 'ready_for_pickup' else 'out_for_delivery' end
   when 'ready_for_pickup' then 'completed' when 'out_for_delivery' then 'completed' else null end;
  if next_state is null then update demo_orders set next_transition_at=null where order_code=r.order_code;continue;end if;
  delay_min:=case next_state when 'confirmed' then 5 when 'preparing' then 30 when 'ready_for_pickup' then 15 when 'out_for_delivery' then 30 else 0 end;
  delay_max:=case next_state when 'confirmed' then 15 when 'preparing' then 90 when 'ready_for_pickup' then 45 when 'out_for_delivery' then 60 else 0 end;
  due:=case when next_state='completed' then null else p_now+make_interval(secs=>delay_min+floor(greatest(0,least(1,coalesce(p_random,random())))*(delay_max-delay_min))) end;
  update demo_orders set status=next_state,updated_at=p_now,next_transition_at=due,
    order_data=order_data||jsonb_build_object('status',next_state,'statusKey','status.'||next_state,'updatedAt',to_char(p_now at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
    where order_code=r.order_code and status=r.status and next_transition_at=r.next_transition_at;
  if not found then continue;end if;
  speakers:=case next_state when 'confirmed' then array['counter','cook'] when 'preparing' then array['cook','oven']
    when 'ready_for_pickup' then array['oven','counter'] when 'out_for_delivery' then array['counter','delivery'] else array['counter','cook'] end;
  select jsonb_build_object('flavorIds',jsonb_agg(distinct line->>'flavorId')) into facts from jsonb_array_elements(r.order_data->'lines') line;
  foreach role_name in array speakers loop
    insert into demo_kitchen_events(order_code,created_at,speaker,template_key,args) values(r.order_code,p_now,role_name,next_state,facts) on conflict do nothing;
  end loop;
  count_done:=count_done+1;
 end loop;
 return count_done;
end $$;

create or replace function public.public_kitchen_snapshot(p_status text default null,p_fulfillment text default null,p_now timestamptz default clock_timestamp())
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare orders jsonb; events jsonb; begin
 select coalesce(jsonb_agg(item order by active desc,created_at desc),'[]'::jsonb) into orders from (
  select jsonb_build_object('orderCode',order_code,'createdAt',created_at,'locale',order_data->'locale','fulfillment',order_data->'fulfillment',
   'status',status,'lines',order_data->'lines','subtotal',order_data->'subtotal','deliveryFee',order_data->'deliveryFee','total',order_data->'total') item,
   (status not in ('completed','cancelled')) active,created_at
  from demo_orders where public_demo and expires_at>p_now and (p_status is null or status=p_status) and (p_fulfillment is null or order_data->>'fulfillment'=p_fulfillment)
  order by (status not in ('completed','cancelled')) desc,created_at desc limit 100
 ) recent;
 select coalesce(jsonb_agg(item order by created_at,sequence),'[]'::jsonb) into events from (
  select jsonb_build_object('id',e.id,'orderCode',e.order_code,'createdAt',e.created_at,'speaker',e.speaker,'templateKey',e.template_key,'args',e.args) item,e.created_at,e.sequence
   from demo_kitchen_events e join demo_orders o on o.order_code=e.order_code where o.public_demo and o.expires_at>p_now and e.created_at>p_now-interval '24 hours'
   order by e.created_at desc,e.sequence desc limit 200
 ) recent_events;
 return jsonb_build_object('orders',orders,'messages',events,'mode','public_demo','simulation',true,'persistence','supabase');
end $$;

create or replace function public.cleanup_public_demo(p_now timestamptz default clock_timestamp()) returns void
language plpgsql security definer set search_path=public,pg_temp as $$ begin
 delete from demo_orders where public_demo and expires_at<=p_now;
 delete from demo_kitchen_events where created_at<=p_now-interval '24 hours';
 perform assistant_cleanup();update demo_simulation_control set last_cleanup_at=p_now where id=true;
end $$;
revoke all on public.demo_kitchen_events,public.demo_simulation_control from public,anon,authenticated;
grant all on public.demo_kitchen_events,public.demo_simulation_control to service_role;
revoke execute on function public.create_public_demo_order(text,text,text,jsonb,double precision,timestamptz),
 public.advance_demo_kitchen(timestamptz,double precision),public.public_kitchen_snapshot(text,text,timestamptz),public.cleanup_public_demo(timestamptz) from public,anon,authenticated;
grant execute on function public.create_public_demo_order(text,text,text,jsonb,double precision,timestamptz),
 public.advance_demo_kitchen(timestamptz,double precision),public.public_kitchen_snapshot(text,text,timestamptz),public.cleanup_public_demo(timestamptz) to service_role;
-- Supabase provides pg_cron. The API also cleans up every minute while running.
-- Embedded PostgreSQL validation has no pg_cron extension; expiry is still tested by calling the same function.
do $$ begin
 if exists(select 1 from pg_available_extensions where name='pg_cron') then
  create extension if not exists pg_cron;
  perform cron.schedule('last-slice-demo-cleanup','*/5 * * * *','select public.cleanup_public_demo();');
 end if;
end $$;
