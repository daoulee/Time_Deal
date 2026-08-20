-- 2026-08-20 커뮤니티 글쓰기 사진 첨부를 1장에서 최대 5장으로 확장합니다.
alter table public.community_posts add column if not exists image_urls text[] not null default '{}';
