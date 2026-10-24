-- Coordination and accounting only. Never store chat text or bearer credentials.
create table if not exists public.assistant_control (
  id boolean primary key default true check (id),
  next_start_at timestamptz not null default '-infinity',
  blocked boolean not null default false,
  window_started_at timestamptz not null default '-infinity',
  window_calls integer not null default 0,
  policy text not null default 'gpt-5-nano-2025-08-07:4000:800:2026-10-24'
);
insert into public.assistant_control(id) values(true) on conflict do nothing;
create table if not exists public.assistant_tickets (
  id uuid primary key, sequence bigint generated always as identity unique,
  owner_hash text not null, process_id uuid not null,
  state text not null check(state in ('queued','running','completed','cancelled','expired','failed')),
  created_at timestamptz not null, expires_at timestamptz not null,
  lease_until timestamptz, started_at timestamptz, completed_at timestamptz,
  error_code text check(error_code in ('assistant_unavailable','assistant_timeout','assistant_budget_exhausted'))
);
create unique index if not exists assistant_one_pending on public.assistant_tickets(owner_hash) where state in ('queued','running');
create table if not exists public.assistant_attempts (
  id uuid primary key references public.assistant_tickets(id),
  accounting_day date not null, charge_nano bigint not null check(charge_nano between 0 and 520000),
  settled boolean not null default false
);
create index if not exists assistant_accounting_day on public.assistant_attempts(accounting_day);
alter table public.assistant_control enable row level security;
alter table public.assistant_tickets enable row level security;
alter table public.assistant_attempts enable row level security;

create or replace function public.assistant_action(
  p_action text, p_id uuid, p_owner text, p_process uuid,
  p_input integer default null, p_output integer default null, p_error text default null,
  p_now timestamptz default clock_timestamp()
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  c assistant_control%rowtype; t assistant_tickets%rowtype;
  spent bigint; waiting integer; pos integer; wait_s numeric; average_s numeric; service_s numeric;
  day_key date := (p_now at time zone 'UTC')::date;
  cutoff timestamptz := p_now - interval '15 minutes';
begin
  select * into c from assistant_control where id=true for update;
  if not found or c.blocked or c.policy <> 'gpt-5-nano-2025-08-07:4000:800:2026-10-24' then
    return jsonb_build_object('error','assistant_unavailable');
  end if;
  if p_action in ('admit','get','cancel') then
    if c.window_started_at+interval '1 minute'<=p_now then
      update assistant_control set window_started_at=p_now,window_calls=1 where id=true;
    elsif c.window_calls>=600 then return jsonb_build_object('error','assistant_queue_full');
    else update assistant_control set window_calls=window_calls+1 where id=true; end if;
  end if;
  update assistant_tickets set state='expired',lease_until=null
    where state='queued' and (expires_at<=p_now or lease_until<=p_now);
  -- A lost worker retains its full unknown charge; work is never replayed.
  update assistant_tickets set state='failed',error_code='assistant_unavailable',completed_at=p_now
    where state='running' and lease_until<=p_now;
  update assistant_tickets set state='expired' where state='completed' and expires_at<=p_now;
  select coalesce(sum(charge_nano),0) into spent from assistant_attempts where accounting_day=day_key;
  select * into t from assistant_tickets where id=p_id;
  if found and t.owner_hash<>p_owner then return jsonb_build_object('error','assistant_request_expired'); end if;

  if p_action='admit' and t.id is null then
    if (select count(*) from assistant_tickets where created_at>=day_key::timestamp at time zone 'UTC')>=5000 then return jsonb_build_object('error','assistant_queue_full'); end if;
    if spent+520000>1000000000 then return jsonb_build_object('error','assistant_budget_exhausted','resetsAt',((day_key+1)::timestamp at time zone 'UTC')); end if;
    if exists(select 1 from assistant_tickets where owner_hash=p_owner and state in ('queued','running')) then return jsonb_build_object('error','assistant_already_pending'); end if;
    select count(*) into waiting from assistant_tickets where state='queued';
    if waiting>=12 then return jsonb_build_object('error','assistant_queue_full'); end if;
    if (select count(*) from assistant_tickets where state='failed' and completed_at>p_now-interval '2 minutes')>=3 then
      return jsonb_build_object('error','assistant_unavailable');
    end if;
    wait_s:=greatest(0,extract(epoch from c.next_start_at-p_now))+waiting*45;
    if wait_s>600 then return jsonb_build_object('error','assistant_queue_full'); end if;
    insert into assistant_tickets(id,owner_hash,process_id,state,created_at,expires_at,lease_until)
      values(p_id,p_owner,p_process,'queued',p_now,p_now+interval '10 minutes',p_now+interval '60 seconds') returning * into t;
  elsif t.id is null then
    return jsonb_build_object('error','assistant_request_expired');
  end if;

  if p_action='claim' then
    if t.process_id<>p_process or t.state<>'queued' or c.next_start_at>p_now or
       exists(select 1 from assistant_tickets where state='running') or
       exists(select 1 from assistant_tickets where state='queued' and sequence<t.sequence) then
      return jsonb_build_object('claimed',false,'state',t.state,'retryAt',greatest(c.next_start_at,p_now+interval '1 second'));
    end if;
    if spent+520000>1000000000 then
      update assistant_tickets set state='failed',error_code='assistant_budget_exhausted',completed_at=p_now where state='queued';
      return jsonb_build_object('error','assistant_budget_exhausted');
    end if;
    insert into assistant_attempts(id,accounting_day,charge_nano) values(p_id,day_key,520000);
    update assistant_control set next_start_at=p_now+interval '45 seconds' where id=true;
    update assistant_tickets set state='running',started_at=p_now,lease_until=p_now+interval '15 seconds' where id=p_id;
    return jsonb_build_object('claimed',true);
  elsif p_action='finish' and t.process_id=p_process and t.state='running' then
    if p_input is not null and p_output is not null and (p_input<0 or p_input>4000 or p_output<0 or p_output>800) then
      update assistant_control set blocked=true where id=true;
      p_error:='assistant_unavailable';
    elsif p_input is not null and p_output is not null then
      update assistant_attempts set charge_nano=p_input::bigint*50+p_output::bigint*400,settled=true where id=p_id and not settled;
    end if;
    update assistant_tickets set state=case when p_error is null then 'completed' else 'failed' end,
      error_code=p_error,completed_at=p_now,expires_at=p_now+interval '5 minutes',lease_until=null where id=p_id returning * into t;
  elsif p_action='cancel' and t.state='queued' then
    update assistant_tickets set state='cancelled',lease_until=null where id=p_id returning * into t;
  elsif p_action='get' and t.state='queued' then
    update assistant_tickets set lease_until=p_now+interval '60 seconds' where id=p_id returning * into t;
  end if;
  if t.state='queued' then
    select count(*)+1 into pos from assistant_tickets where state='queued' and sequence<t.sequence;
    wait_s:=greatest(0,extract(epoch from c.next_start_at-p_now))+(pos-1)*45;
  else wait_s:=0; end if;
  select avg(total),avg(service) into average_s,service_s from (
    select extract(epoch from completed_at-created_at) total,extract(epoch from completed_at-started_at) service
      from assistant_tickets where completed_at>=cutoff and started_at is not null and error_code is null
        and state in ('completed','expired') order by completed_at desc limit 100
  ) recent having count(*)>=5;
  return jsonb_strip_nulls(jsonb_build_object(
    'requestId',t.id,'state',t.state,'processId',t.process_id,'position',pos,'error',t.error_code,
    'resetsAt',case when t.error_code='assistant_budget_exhausted' then ((day_key+1)::timestamp at time zone 'UTC') else null end,
    'estimatedWaitSeconds',ceil(wait_s),'estimatedReplySeconds',ceil(wait_s+coalesce(service_s,8)),
    'recentAverageReplySeconds',ceil(average_s),'estimateUpdatedAt',p_now,'pollAfterSeconds',3
  ));
end $$;
revoke all on public.assistant_control, public.assistant_tickets, public.assistant_attempts from public,anon,authenticated;
grant all on public.assistant_control, public.assistant_tickets, public.assistant_attempts to service_role;
revoke execute on function public.assistant_action(text,uuid,text,uuid,integer,integer,text,timestamptz) from public,anon,authenticated;
grant execute on function public.assistant_action(text,uuid,text,uuid,integer,integer,text,timestamptz) to service_role;

create or replace function public.assistant_cleanup() returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  delete from assistant_attempts where accounting_day < (clock_timestamp() at time zone 'UTC')::date-7;
  delete from assistant_tickets where created_at < clock_timestamp()-interval '8 days' and not exists(select 1 from assistant_attempts a where a.id=assistant_tickets.id);
end $$;
revoke execute on function public.assistant_cleanup() from public,anon,authenticated;
grant execute on function public.assistant_cleanup() to service_role;
