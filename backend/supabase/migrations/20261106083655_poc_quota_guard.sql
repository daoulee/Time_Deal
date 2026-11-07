-- PoC용 사용량은 웹 공개 테이블과 분리한다. 운영 DB에는 검증 전 적용하지 않는다.
create schema if not exists timedeal_poc_private;
revoke all on schema timedeal_poc_private from public, anon, authenticated;

create table if not exists timedeal_poc_private.daily_quota (
  utc_day date not null,
  bucket text not null,
  subject text not null,
  uses integer not null default 0 check (uses >= 0),
  primary key (utc_day, bucket, subject)
);
alter table timedeal_poc_private.daily_quota enable row level security;
revoke all on table timedeal_poc_private.daily_quota from public, anon, authenticated;

create or replace function public.timedeal_poc_consume_ai_quota(p_actor_id uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_day date := (now() at time zone 'UTC')::date;
  v_user_count integer;
  v_total_count integer;
begin
  if p_actor_id is null or not exists (
    select 1 from public.profiles where id = p_actor_id and not is_suspended
  ) then return false; end if;
  perform pg_advisory_xact_lock(hashtext('timedeal_poc_ai_quota_v1'));
  select coalesce((select uses from timedeal_poc_private.daily_quota where utc_day=v_day and bucket='ai' and subject=p_actor_id::text),0) into v_user_count;
  select coalesce((select uses from timedeal_poc_private.daily_quota where utc_day=v_day and bucket='ai' and subject='global'),0) into v_total_count;
  if v_user_count >= 30 or v_total_count >= 300 then return false; end if;
  insert into timedeal_poc_private.daily_quota(utc_day,bucket,subject,uses)
  values (v_day,'ai',p_actor_id::text,1), (v_day,'ai','global',1)
  on conflict (utc_day,bucket,subject) do update set uses=timedeal_poc_private.daily_quota.uses+1;
  return true;
end;
$$;

create or replace function public.timedeal_poc_consume_guest_quota()
returns boolean language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_day date := (now() at time zone 'UTC')::date;
  v_total_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('timedeal_poc_guest_quota_v1'));
  select coalesce((select uses from timedeal_poc_private.daily_quota where utc_day=v_day and bucket='guest' and subject='global'),0) into v_total_count;
  if v_total_count >= 100 then return false; end if;
  insert into timedeal_poc_private.daily_quota(utc_day,bucket,subject,uses)
  values (v_day,'guest','global',1)
  on conflict (utc_day,bucket,subject) do update set uses=timedeal_poc_private.daily_quota.uses+1;
  return true;
end;
$$;

revoke all on function public.timedeal_poc_consume_ai_quota(uuid) from public, anon, authenticated;
revoke all on function public.timedeal_poc_consume_guest_quota() from public, anon, authenticated;
grant execute on function public.timedeal_poc_consume_ai_quota(uuid) to service_role;
grant execute on function public.timedeal_poc_consume_guest_quota() to service_role;
-- [Codex | 2026-11-06] PoC 할당량 — 재시작에도 유지되는 원자적 일일 상한
