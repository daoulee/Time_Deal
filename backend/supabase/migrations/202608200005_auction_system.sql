-- 직판장 경매(어업 직판장 실시간 경매) 시스템 테이블입니다.
-- 낙찰 대금은 auction_settlements에서 에스크로 보관 상태로 추적하고,
-- 결제 타임아웃·재경매·재입찰 영구 제한은 백엔드에서 조회 시점에 지연 평가(lazy expiry)로 처리합니다.
create table if not exists public.auction_items (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  origin text not null,
  image text not null default '',
  category text not null default '수산물',
  start_price integer not null check(start_price >= 0),
  current_price integer not null check(current_price >= 0),
  min_bid_increment integer not null default 1000 check(min_bid_increment > 0),
  highest_bidder_id uuid references public.profiles(id) on delete set null,
  status text not null default 'live' check(status in ('upcoming','live','payment_pending','escrow_hold','completed','re_auction','cancelled')),
  ends_at timestamptz not null,
  payment_deadline timestamptz,
  allow_pickup boolean not null default true,
  pickup_location text not null default '',
  parcel_fee integer not null default 5000,
  allow_quick boolean not null default true,
  seller_handles_delivery boolean not null default false,
  fee_promo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.auction_bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auction_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check(amount >= 0),
  created_at timestamptz not null default now()
);
create table if not exists public.auction_penalties (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auction_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null default 'payment_timeout',
  created_at timestamptz not null default now(),
  unique(auction_id, user_id)
);
create table if not exists public.auction_orders (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null unique references public.auction_items(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  delivery_method text not null check(delivery_method in ('PICKUP','PARCEL','QUICK')),
  delivery_address text,
  parcel_payment text check(parcel_payment in ('prepaid','cod')),
  delivery_fee integer not null default 0,
  winning_amount integer not null,
  total_amount integer not null,
  buyer_confirmed_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.auction_settlements (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null unique references public.auction_items(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  total_amount integer not null,
  fee_rate numeric not null default 0,
  fee_amount integer not null default 0,
  final_settlement_amount integer not null,
  status text not null default 'pending_confirmation' check(status in ('pending_confirmation','ready_to_settle','paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists auction_items_status_idx on public.auction_items(status, ends_at);
create index if not exists auction_bids_auction_idx on public.auction_bids(auction_id, created_at desc);
create index if not exists auction_settlements_seller_idx on public.auction_settlements(seller_id, status);
create index if not exists auction_orders_buyer_idx on public.auction_orders(buyer_id, created_at desc);
alter table public.auction_items enable row level security;
alter table public.auction_bids enable row level security;
alter table public.auction_penalties enable row level security;
alter table public.auction_orders enable row level security;
alter table public.auction_settlements enable row level security;
create policy "public read auctions" on public.auction_items for select using (true);
create policy "public read bids" on public.auction_bids for select using (true);
