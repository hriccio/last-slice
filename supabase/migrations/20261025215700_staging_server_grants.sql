-- Fresh hosted projects may not grant DML privileges by default.
-- RLS remains enabled; public clients must use the TypeScript API.
revoke all on public.demo_menu, public.demo_orders from public, anon, authenticated, service_role;
grant select on public.demo_menu to service_role;
grant select, insert, update on public.demo_orders to service_role;
