-- 2026-09-02 자주 실행되는 조회 쿼리에 맞는 인덱스 보강
-- 기존 복합 인덱스(products_seller_status_idx, deals_product_status_time_idx)는 각각
-- seller_id/product_id가 맨 앞이라, 그 컬럼 없이 status만으로 조회하는 홈 화면·상품 목록
-- (/api/catalog, /api/deals — 가장 트래픽이 많은 공개 조회) 쿼리에는 실제로 안 쓰입니다.
begin;

create index if not exists products_status_idx on public.products(status);
create index if not exists deals_status_ends_at_idx on public.deals(status, ends_at);
create index if not exists reviews_product_status_idx on public.reviews(product_id, status, created_at desc);
create index if not exists orders_user_created_idx on public.orders(user_id, created_at desc);

commit;
