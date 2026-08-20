-- 2026-08-20 홈 화면 "이 딜 다시 열어주세요" 재오픈 요청 투표 기능
-- 로그인한 고객이 상품별로 재오픈을 요청(토글)할 수 있고, 담당 판매자가 판매자센터에서 집계를 확인합니다.
begin;

create table if not exists public.reopen_requests (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(product_id, user_id)
);
create index if not exists reopen_requests_product_idx on public.reopen_requests(product_id, created_at desc);
alter table public.reopen_requests enable row level security;

commit;
