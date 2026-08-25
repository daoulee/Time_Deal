-- 2026-08-25 실제 검색 데이터를 쌓아 하드코딩된 인기 검색어를 실제 데이터로 교체합니다.
create table if not exists public.search_terms (
  term text primary key,
  search_count integer not null default 0,
  last_searched_at timestamptz not null default now()
);
alter table public.search_terms enable row level security;
