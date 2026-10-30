create table if not exists public.demo_pizza_sales_daily (
 sale_day date not null,
 flavor_id text not null,
 quantity bigint not null check (quantity >= 0),
 primary key (sale_day, flavor_id)
);
alter table public.demo_pizza_sales_daily enable row level security;
revoke all on public.demo_pizza_sales_daily from public, anon, authenticated;
grant all on public.demo_pizza_sales_daily to service_role;

create or replace function public.record_completed_demo_pizza_sales()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare sale_day_utc date; begin
 if not new.public_demo or new.status <> 'completed' or old.status = 'completed' then return new; end if;
 sale_day_utc := (new.updated_at at time zone 'UTC')::date;
 insert into public.demo_pizza_sales_daily(sale_day, flavor_id, quantity)
 select sale_day_utc, line->>'flavorId', sum(coalesce((line->>'quantity')::integer,1))
 from jsonb_array_elements(new.order_data->'lines') line
 where line->>'flavorId' is not null
 group by line->>'flavorId'
 on conflict (sale_day, flavor_id) do update
 set quantity = demo_pizza_sales_daily.quantity + excluded.quantity;
 return new;
end $$;

drop trigger if exists demo_order_completed_pizza_sales on public.demo_orders;
create trigger demo_order_completed_pizza_sales
after update of status on public.demo_orders
for each row execute function public.record_completed_demo_pizza_sales();

create or replace function public.cleanup_demo_pizza_sales(p_now timestamptz default clock_timestamp())
returns void language sql set search_path=public,pg_temp as $$
 delete from public.demo_pizza_sales_daily
 where sale_day < ((p_now at time zone 'UTC')::date - 6);
$$;
revoke execute on function public.record_completed_demo_pizza_sales(), public.cleanup_demo_pizza_sales(timestamptz) from public, anon, authenticated;
grant execute on function public.record_completed_demo_pizza_sales(), public.cleanup_demo_pizza_sales(timestamptz) to service_role;
