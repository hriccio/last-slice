alter table public.demo_orders
  add column if not exists status text not null default 'received';

alter table public.demo_orders
  add column if not exists updated_at timestamptz;

update public.demo_orders
set status = case
  when order_data->>'status' in (
    'received', 'confirmed', 'preparing', 'ready_for_pickup',
    'out_for_delivery', 'completed', 'cancelled'
  ) then order_data->>'status'
  else 'received'
end,
updated_at = coalesce(updated_at, created_at);

alter table public.demo_orders
  alter column updated_at set default now(),
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'demo_orders_status_check'
      and conrelid = 'public.demo_orders'::regclass
  ) then
    alter table public.demo_orders
      add constraint demo_orders_status_check
      check (status in (
        'received', 'confirmed', 'preparing', 'ready_for_pickup',
        'out_for_delivery', 'completed', 'cancelled'
      ));
  end if;
end $$;

create index if not exists demo_orders_status_created_at_idx
  on public.demo_orders (status, created_at desc);
