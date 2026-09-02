-- 2026-09-02 백엔드 미처리 예외와 프론트 런타임 에러를 관리자 콘솔에서 바로 볼 수 있게 저장합니다.
-- 서비스 역할 키(getAdminSupabase)로만 읽고 쓰므로 RLS는 활성화만 하고 별도 정책은 두지 않습니다
-- (anon/authenticated 키로는 조회·기록 모두 차단됨).
begin;

create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('backend', 'frontend')),
  level text not null default 'error' check (level in ('error', 'warn')),
  message text not null,
  stack text,
  path text,
  method text,
  status_code integer,
  request_id text,
  user_id uuid references public.profiles(id) on delete set null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists error_logs_created_at_idx on public.error_logs(created_at desc);
alter table public.error_logs enable row level security;

commit;
