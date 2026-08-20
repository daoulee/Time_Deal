-- 2026-08-21 찜(위시리스트), 실제 장바구니, 리뷰 사진 첨부, 인앱 알림 센터를 추가합니다.
create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, product_id)
);
create index if not exists wishlist_items_user_idx on public.wishlist_items(user_id, created_at desc);
alter table public.wishlist_items enable row level security;
create policy "own wishlist" on public.wishlist_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  deal_id text references public.deals(id) on delete set null,
  quantity integer not null default 1 check (quantity between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, product_id)
);
create index if not exists cart_items_user_idx on public.cart_items(user_id, created_at desc);
alter table public.cart_items enable row level security;
create policy "own cart" on public.cart_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.reviews add column if not exists image_urls text[] not null default '{}';

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;
create policy "own notifications read" on public.notifications for select using (auth.uid() = user_id);
create policy "own notifications update" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
