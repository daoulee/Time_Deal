-- 2026-08-20 주문 내역 기반 재입고 요청 기능
-- 이미 주문한 상품에 대해서만 재입고 요청을 보낼 수 있고, 판매자가 예상 입고일과 답변을 남길 수 있습니다.
create table if not exists public.restock_requests (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  message text not null default '',
  status text not null default 'pending' check(status in ('pending','answered')),
  expected_restock_date date,
  seller_reply text,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists restock_requests_product_idx on public.restock_requests(product_id, created_at desc);
create index if not exists restock_requests_user_idx on public.restock_requests(user_id, created_at desc);
alter table public.restock_requests enable row level security;
